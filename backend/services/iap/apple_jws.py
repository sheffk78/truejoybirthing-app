"""Apple StoreKit 2 JWS signed-transaction verification.

StoreKit 2 returns each transaction as a JWS (RFC 7515) compact token:

    <b64url(header)>.<b64url(payload)>.<b64url(signature)>

The header contains an `x5c` array: a chain of PEM-encoded certificates
(leaf, intermediate, root). We must:

  1. Parse the header and extract the chain.
  2. Verify each certificate in the chain is signed by the next one, and the
     last cert chains up to Apple's published root CA.
  3. Verify the JWS signature over `header.payload` using the leaf cert's
     public key (Apple uses ES256 / P-256 ECDSA).
  4. Verify the decoded payload's `bundleId` matches our app and the
     transaction is otherwise well-formed.

References:
  - https://developer.apple.com/documentation/appstoreserverapi/jwstransaction
  - https://developer.apple.com/documentation/appstoreserverapi/jwsdecodedheader
  - https://www.apple.com/certificateauthority/
"""

from __future__ import annotations

import base64
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.x509.oid import ExtensionOID

logger = logging.getLogger(__name__)

# Apple's root CA for StoreKit 2 JWS signing (Apple Root CA - G3).
# Shipped alongside this module so verification does not depend on network.
_APPLE_ROOT_CA_PATH = os.path.join(os.path.dirname(__file__), "AppleRootCA-G3.cer")

# Expected bundle identifier for the True Joy Birthing app.
EXPECTED_BUNDLE_ID = "com.truejoybirthing.app"


class AppleReceiptVerificationError(Exception):
    """Raised when an Apple JWS receipt fails verification."""


@dataclass
class VerifiedAppleTransaction:
    transaction_id: str
    original_transaction_id: str
    product_id: str
    bundle_id: str
    environment: str  # "Sandbox" or "Production"
    in_trial_period: bool
    expires_date_ms: Optional[int]
    raw_payload: dict[str, Any]


def _b64url_decode(segment: str) -> bytes:
    padded = segment + "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(padded)


def _load_apple_root() -> x509.Certificate:
    with open(_APPLE_ROOT_CA_PATH, "rb") as f:
        data = f.read()
    # The Apple file is distributed as DER.
    try:
        return x509.load_der_x509_certificate(data)
    except ValueError:
        return x509.load_pem_x509_certificate(data)


def _load_chain_from_header(x5c: list[str]) -> list[x509.Certificate]:
    # Each entry is base64 (standard, not url-safe) of the DER cert.
    chain: list[x509.Certificate] = []
    for entry in x5c:
        der = base64.b64decode(entry)
        chain.append(x509.load_der_x509_certificate(der))
    return chain


def _ecdsa_jose_to_der(signature: bytes) -> bytes:
    # JWS ES256 signatures are r||s raw 64 bytes; cryptography expects DER.
    if len(signature) % 2 != 0:
        raise AppleReceiptVerificationError("Invalid ES256 signature length")
    half = len(signature) // 2
    r = int.from_bytes(signature[:half], "big")
    s = int.from_bytes(signature[half:], "big")
    return encode_dss_signature(r, s)


def _verify_chain(chain: list[x509.Certificate], root: x509.Certificate) -> None:
    if not chain:
        raise AppleReceiptVerificationError("Empty certificate chain")

    # Verify each cert is signed by the next. Append root at the end so the
    # final intermediate is verified against the trusted root.
    full = chain + [root]
    for i in range(len(full) - 1):
        child = full[i]
        parent = full[i + 1]
        parent_pub = parent.public_key()
        try:
            if isinstance(parent_pub, ec.EllipticCurvePublicKey):
                parent_pub.verify(
                    child.signature,
                    child.tbs_certificate_bytes,
                    ec.ECDSA(child.signature_hash_algorithm),
                )
            else:
                parent_pub.verify(
                    child.signature,
                    child.tbs_certificate_bytes,
                    padding.PKCS1v15(),
                    child.signature_hash_algorithm,
                )
        except InvalidSignature as exc:
            raise AppleReceiptVerificationError(
                f"Certificate chain link {i} does not verify against its issuer"
            ) from exc

    # Confirm the last cert in the submitted chain is actually issued by root.
    submitted_root_issuer = chain[-1].issuer
    if submitted_root_issuer != root.subject:
        raise AppleReceiptVerificationError(
            "Submitted chain does not terminate at Apple Root CA - G3"
        )


def verify_apple_jws(
    token: str,
    *,
    expected_bundle_id: str = EXPECTED_BUNDLE_ID,
    expected_product_id: Optional[str] = None,
) -> VerifiedAppleTransaction:
    """Fully verify an Apple StoreKit 2 signed transaction.

    Raises AppleReceiptVerificationError on any failure.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise AppleReceiptVerificationError(
            f"Receipt is not a well-formed JWS (got {len(parts)} segments)"
        )

    header_raw, payload_raw, signature_raw = parts

    try:
        header = json.loads(_b64url_decode(header_raw))
    except Exception as exc:
        raise AppleReceiptVerificationError("Unable to decode JWS header") from exc

    alg = header.get("alg")
    if alg != "ES256":
        raise AppleReceiptVerificationError(f"Unexpected JWS alg: {alg!r} (expected ES256)")

    x5c = header.get("x5c")
    if not isinstance(x5c, list) or not x5c:
        raise AppleReceiptVerificationError("JWS header is missing x5c certificate chain")

    chain = _load_chain_from_header(x5c)
    root = _load_apple_root()
    _verify_chain(chain, root)

    leaf = chain[0]
    leaf_pub = leaf.public_key()
    if not isinstance(leaf_pub, ec.EllipticCurvePublicKey):
        raise AppleReceiptVerificationError("Leaf certificate is not an EC key")

    signed_bytes = f"{header_raw}.{payload_raw}".encode("ascii")
    signature_bytes = _b64url_decode(signature_raw)
    der_sig = _ecdsa_jose_to_der(signature_bytes)
    try:
        leaf_pub.verify(der_sig, signed_bytes, ec.ECDSA(hashes.SHA256()))
    except InvalidSignature as exc:
        raise AppleReceiptVerificationError("JWS signature is invalid") from exc

    try:
        payload = json.loads(_b64url_decode(payload_raw))
    except Exception as exc:
        raise AppleReceiptVerificationError("Unable to decode JWS payload") from exc

    bundle_id = payload.get("bundleId") or payload.get("bid")
    if bundle_id != expected_bundle_id:
        raise AppleReceiptVerificationError(
            f"Bundle id mismatch: receipt has {bundle_id!r}, expected {expected_bundle_id!r}"
        )

    product_id = payload.get("productId")
    if expected_product_id and product_id != expected_product_id:
        raise AppleReceiptVerificationError(
            f"Product id mismatch: receipt has {product_id!r}, expected {expected_product_id!r}"
        )

    transaction_id = payload.get("transactionId") or payload.get("originalTransactionId")
    if not transaction_id:
        raise AppleReceiptVerificationError("Receipt payload is missing transactionId")

    # offerType: 1=introductory, 2=promotional, 3=subscription offer code
    # inAppOwnershipType: "PURCHASED" for new purchases
    # type: "Auto-Renewable Subscription" for subs
    in_trial_period = (
        payload.get("offerType") == 1  # introductory offer = free trial
        or bool(payload.get("isUpgraded", False)) is False
        and payload.get("offerDiscountType") == "FREE_TRIAL"
    )

    verified = VerifiedAppleTransaction(
        transaction_id=str(transaction_id),
        original_transaction_id=str(payload.get("originalTransactionId", transaction_id)),
        product_id=str(product_id or ""),
        bundle_id=str(bundle_id),
        environment=str(payload.get("environment", "Production")),
        in_trial_period=in_trial_period,
        expires_date_ms=payload.get("expiresDate"),
        raw_payload=payload,
    )
    logger.info(
        "[IAP] Apple JWS verified: txn=%s product=%s env=%s",
        verified.transaction_id,
        verified.product_id,
        verified.environment,
    )
    return verified
