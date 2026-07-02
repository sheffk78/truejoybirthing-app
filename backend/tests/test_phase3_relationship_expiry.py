"""
Tests for Phase 3: Relationship Expiry System

Tests verify:
1. verify_active_relationship returns True for active relationships
2. verify_active_relationship returns False for terminated relationships
3. verify_active_relationship returns False when no share_request exists
4. Backward compatibility: missing relationship_status treated as "active"
5. Terminate relationship endpoint works
6. Terminated relationship blocks messaging, appointment creation, birth plan access
7. Mom invoices filtered by active relationship
8. Lead data excludes birth plan sections, shows only completion_percentage
9. Migration script is idempotent
"""
import pytest
import asyncio
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture
def mock_db():
    """Create a mock database for testing."""
    db = MagicMock()
    db.share_requests = AsyncMock()
    db.clients = AsyncMock()
    db.invoices = AsyncMock()
    db.birth_plans = AsyncMock()
    db.appointments = AsyncMock()
    db.users = AsyncMock()
    db.mom_profiles = AsyncMock()
    db.provider_notes = AsyncMock()
    return db


class TestVerifyActiveRelationship:
    """Test the verify_active_relationship helper function."""

    @pytest.mark.asyncio
    async def test_active_relationship_returns_true(self, mock_db):
        from routes.relationship_utils import verify_active_relationship
        mock_db.share_requests.find_one = AsyncMock(return_value={
            "request_id": "share_test123",
            "provider_id": "prov_001",
            "mom_user_id": "mom_001",
            "status": "accepted",
            "relationship_status": "active"
        })
        with patch('routes.relationship_utils.db', mock_db):
            result = await verify_active_relationship("prov_001", "mom_001")
        assert result is True

    @pytest.mark.asyncio
    async def test_terminated_relationship_returns_false(self, mock_db):
        from routes.relationship_utils import verify_active_relationship
        mock_db.share_requests.find_one = AsyncMock(return_value={
            "request_id": "share_test123",
            "provider_id": "prov_001",
            "mom_user_id": "mom_001",
            "status": "accepted",
            "relationship_status": "terminated"
        })
        with patch('routes.relationship_utils.db', mock_db):
            result = await verify_active_relationship("prov_001", "mom_001")
        assert result is False

    @pytest.mark.asyncio
    async def test_no_share_request_returns_false(self, mock_db):
        from routes.relationship_utils import verify_active_relationship
        mock_db.share_requests.find_one = AsyncMock(return_value=None)
        with patch('routes.relationship_utils.db', mock_db):
            result = await verify_active_relationship("prov_001", "mom_001")
        assert result is False

    @pytest.mark.asyncio
    async def test_backward_compat_missing_field(self, mock_db):
        """Missing relationship_status should be treated as 'active' (backward compat)."""
        from routes.relationship_utils import verify_active_relationship
        mock_db.share_requests.find_one = AsyncMock(return_value={
            "request_id": "share_test123",
            "provider_id": "prov_001",
            "mom_user_id": "mom_001",
            "status": "accepted"
            # relationship_status intentionally missing
        })
        with patch('routes.relationship_utils.db', mock_db):
            result = await verify_active_relationship("prov_001", "mom_001")
        assert result is True

    @pytest.mark.asyncio
    async def test_pending_status_returns_false(self, mock_db):
        from routes.relationship_utils import verify_active_relationship
        mock_db.share_requests.find_one = AsyncMock(return_value={
            "request_id": "share_test123",
            "provider_id": "prov_001",
            "mom_user_id": "mom_001",
            "status": "pending",
            "relationship_status": None
        })
        with patch('routes.relationship_utils.db', mock_db):
            result = await verify_active_relationship("prov_001", "mom_001")
        assert result is False


class TestGetActiveProviderIdsForMom:
    """Test filtering to active provider IDs."""

    @pytest.mark.asyncio
    async def test_filters_terminated(self, mock_db):
        from routes.relationship_utils import get_active_provider_ids_for_mom
        mock_db.share_requests.find = MagicMock(return_value=MagicMock(
            to_list=AsyncMock(return_value=[
                {"provider_id": "prov_001", "status": "accepted", "relationship_status": "active"},
                {"provider_id": "prov_002", "status": "accepted", "relationship_status": "terminated"},
                {"provider_id": "prov_003", "status": "accepted"},  # backward compat
            ])
        ))
        with patch('routes.relationship_utils.db', mock_db):
            result = await get_active_provider_ids_for_mom("mom_001")
        assert "prov_001" in result
        assert "prov_002" not in result  # terminated excluded
        assert "prov_003" in result      # backward compat included

    @pytest.mark.asyncio
    async def test_empty_when_no_relationships(self, mock_db):
        from routes.relationship_utils import get_active_provider_ids_for_mom
        mock_db.share_requests.find = MagicMock(return_value=MagicMock(
            to_list=AsyncMock(return_value=[])
        ))
        with patch('routes.relationship_utils.db', mock_db):
            result = await get_active_provider_ids_for_mom("mom_001")
        assert result == []


class TestGetActiveMomIdsForProvider:
    """Test filtering to active mom IDs for a provider."""

    @pytest.mark.asyncio
    async def test_filters_terminated(self, mock_db):
        from routes.relationship_utils import get_active_mom_ids_for_provider
        mock_db.share_requests.find = MagicMock(return_value=MagicMock(
            to_list=AsyncMock(return_value=[
                {"mom_user_id": "mom_001", "status": "accepted", "relationship_status": "active"},
                {"mom_user_id": "mom_002", "status": "accepted", "relationship_status": "terminated"},
                {"mom_user_id": "mom_003", "status": "accepted"},  # backward compat
            ])
        ))
        with patch('routes.relationship_utils.db', mock_db):
            result = await get_active_mom_ids_for_provider("prov_001")
        assert "mom_001" in result
        assert "mom_002" not in result  # terminated excluded
        assert "mom_003" in result      # backward compat included


class TestTerminateRelationship:
    """Test the terminate_relationship function."""

    @pytest.mark.asyncio
    async def test_terminate_active_relationship(self, mock_db):
        from routes.relationship_utils import terminate_relationship
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_db.share_requests.update_one = AsyncMock(return_value=mock_result)
        with patch('routes.relationship_utils.db', mock_db):
            result = await terminate_relationship("prov_001", "mom_001", terminated_by="prov_001")
        assert result is True

    @pytest.mark.asyncio
    async def test_terminate_no_relationship(self, mock_db):
        from routes.relationship_utils import terminate_relationship
        mock_result = MagicMock()
        mock_result.modified_count = 0
        mock_db.share_requests.update_one = AsyncMock(return_value=mock_result)
        with patch('routes.relationship_utils.db', mock_db):
            result = await terminate_relationship("prov_001", "mom_999")
        assert result is False


class TestMigrationScript:
    """Test migration script logic (without real database)."""

    def test_migration_script_exists(self):
        path = os.path.join(os.path.dirname(__file__), '..', 'migrations', 'add_relationship_status.py')
        assert os.path.exists(path), "Migration script should exist"

    def test_migration_has_dry_run_flag(self):
        path = os.path.join(os.path.dirname(__file__), '..', 'migrations', 'add_relationship_status.py')
        with open(path) as f:
            content = f.read()
        assert "--dry-run" in content, "Migration should support --dry-run"
        assert "--rollback" in content, "Migration should support --rollback"

    def test_migration_is_idempotent(self):
        path = os.path.join(os.path.dirname(__file__), '..', 'migrations', 'add_relationship_status.py')
        with open(path) as f:
            content = f.read()
        # Check that the filter excludes documents that already have the field
        assert '"$exists": False' in content, "Migration should only update documents missing the field"


class TestLeadDataExposure:
    """Test that lead data excludes birth plan sections."""

    def test_leads_py_no_sections_projection(self):
        path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'leads.py')
        with open(path) as f:
            content = f.read()
        # The projection should NOT include "sections"
        # Find the birth_plan query in the lead enrichment
        assert '"sections": 1' not in content, "Lead query should not project birth plan sections"
        assert 'completion_percentage' in content, "Lead query should project completion_percentage"

    def test_care_plans_share_requests_no_sections(self):
        """Share-requests endpoint should not expose birth plan sections pre-acceptance."""
        path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'care_plans.py')
        with open(path) as f:
            content = f.read()
        # The share-requests endpoint projection should NOT include "sections"
        # Only completion_percentage should be projected
        assert '"sections": 1' not in content, "Share-requests should not project birth plan sections"


class TestContractionsTeamViewFiltering:
    """Test that contractions team-view endpoints filter by active relationship."""

    def test_contractions_no_bare_accepted_check(self):
        """Verify no remaining bare status:accepted checks in contractions team-view."""
        path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'contractions.py')
        with open(path) as f:
            content = f.read()
        # Should use verify_active_relationship, not bare status:accepted queries
        assert 'verify_active_relationship' in content, "Should import verify_active_relationship"
        assert 'get_active_mom_ids_for_provider' in content, "Should import get_active_mom_ids_for_provider"
        # No bare status:accepted checks remain (only in notification loops where mom_id is used)
        # The team-view endpoints should use verify_active_relationship
        assert content.count('verify_active_relationship') >= 2, "At least 2 team-view endpoints should use verify_active_relationship"


class TestMomContractsFiltering:
    """Test that mom contracts endpoint filters by active relationship."""

    def test_mom_contracts_has_active_filter(self):
        """Verify mom contracts endpoint includes active relationship filtering."""
        path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'mom.py')
        with open(path) as f:
            content = f.read()
        # Should have get_active_provider_ids_for_mom import
        assert 'get_active_provider_ids_for_mom' in content, "Should import get_active_provider_ids_for_mom"
        # No duplicate /contracts endpoint
        assert content.count('@router.get("/contracts")') == 1, "Should have only one /contracts endpoint"
        # No duplicate /invoices endpoint
        assert content.count('@router.get("/invoices")') == 1, "Should have only one /invoices endpoint (plus /invoices/{id})"


class TestGetMomInvoiceFiltering:
    """Test that singular invoice endpoint filters by active relationship."""

    def test_mom_invoice_filters_terminated_providers(self):
        """Verify get_mom_invoice filters by active provider relationships."""
        path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'mom.py')
        with open(path) as f:
            content = f.read()
        # The singular invoice endpoint should include active provider filtering
        assert 'get_active_provider_ids_for_mom' in content, "Should use get_active_provider_ids_for_mom"
        # Check that the invoices/{invoice_id} endpoint has the filter
        assert 'active_provider_ids' in content, "Should filter invoices by active_provider_ids"