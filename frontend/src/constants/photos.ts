// photos.ts — variety pool for recurring photo surfaces (walkthrough, bands).
//
// Why this file exists (Jeff 10/01 — photo-variety directive): the five approved
// BAND_* photos stay frozen in designRefresh.ts (screen identity), but recurring
// surfaces were over-using one B&W shoot (hero-newborn-sleeping 4×, hero-family-
// moment 4×, hero-skin-to-skin 3× — see docs/SPACE-AND-PHOTO-AUDIT-2026-10-01.md
// Part 2). This pool reuses already-vetted WEBSITE city-page photography
// (professional-with-pregnant-woman scenes from the city support-scene library),
// downscaled to 750px webp (~14-32KB each, 185KB total bundle cost).
//
// Every file here passed a live vision check on 2026-10-01: real photography,
// no anatomical errors, no AI tells. AI-art suspects that FAILED the check and
// were excluded: chandler-az-birth-doula-support-v2, corona-ca-support-scene-v2.
// Names are app-local (source file in parentheses):
//
//   band-start-here       ← chula-vista-ca-support-scene.webp (scrubs pro + mom on sofa)
//   ph-midwife-newborn    ← hospital-newborn.webp             (newborn care, gloved hands)
//   ph-lactation-feeding  ← doula-breastfeeding.webp          (first feed, hospital)
//   ph-doula-consult      ← doula-walking.webp                (living-room consult)
//   ph-midwife-support    ← amarillo-tx-support-scene-v3.webp (golden-hour field walk)
//   ph-doula-labor        ← doula-counter-pressure.webp       (bedroom labor support)
//   ph-lactation-consult  ← gilbert-az-doula-support-scene.webp (shoulder-support close-up)
//   ph-lactation-clients  ← allen-tx-birth-doula-support-v2.webp (bench consult scene)
//
import { ImageSourcePropType } from 'react-native';

export const bandStartHere = require('../../assets/images/band-start-here.webp');
export const phLactationClients = require('../../assets/images/ph-lactation-clients.webp');
export const phMidwifeNewborn = require('../../assets/images/ph-midwife-newborn.webp');
export const phLactationFeeding = require('../../assets/images/ph-lactation-feeding.webp');
export const phDoulaConsult = require('../../assets/images/ph-doula-consult.webp');
export const phMidwifeSupport = require('../../assets/images/ph-midwife-support.webp');
export const phDoulaLabor = require('../../assets/images/ph-doula-labor.webp');
export const phLactationConsult = require('../../assets/images/ph-lactation-consult.webp');

/** Convenience map for slots that iterate (walkthrough steps etc.). */
export const VARIETY_PHOTOS: Record<string, ImageSourcePropType> = {
  bandStartHere,
  phMidwifeNewborn,
  phLactationFeeding,
  phDoulaConsult,
  phMidwifeSupport,
  phDoulaLabor,
  phLactationConsult,
  phLactationClients,
};