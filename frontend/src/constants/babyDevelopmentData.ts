/**
 * Baby Development Data for True Joy Birthing
 * 
 * Offline-first data for weekly baby development content (pregnancy weeks 4-40).
 * Each entry includes a title, description, phase indicator, and optional
 * food/size reference for early weeks.
 * 
 * Phase types:
 * - "size_reference" (weeks 4-12): Food-item illustrations with size comparisons
 * - "cross_section" (weeks 13-40): Baby-in-belly cross-section illustrations
 */

export type BabyDevPhase = 'size_reference' | 'cross_section';

export interface BabyDevEntry {
  week: number;
  title: string;
  description: string;
  phase: BabyDevPhase;
  food: string | null;
  sizeNote: string | null;
  imageName: string;
}

/**
 * Get the image filename for a given pregnancy week.
 * Week 20 uses a special "anchor" variant filename.
 */
export function getBabyImageName(week: number): string {
  if (week === 20) {
    return 'pregnancy-week-20-anchor-approved.webp';
  }
  return `pregnancy-week-${String(week).padStart(2, '0')}-approved.webp`;
}

/**
 * Get the display label for a baby development entry.
 * Returns "As small as a [food]" for size_reference phase,
 * or "Your baby this week" for cross_section phase.
 */
export function getBabyDevLabel(entry: BabyDevEntry): string {
  if (entry.phase === 'size_reference' && entry.food) {
    return `As small as a ${entry.food}`;
  }
  return 'Your baby this week';
}

// All baby development data, indexed by week (4-40)
export const BABY_DEVELOPMENT_DATA: BabyDevEntry[] = [
  {
    week: 4,
    title: 'As small as a poppy seed',
    description: 'Your baby is still tiny — the embryo is now fully implanted in the uterus and the amniotic sac is beginning to form. One fascinating early step is that the placenta is already starting to develop, even before your baby looks anything like a baby yet.',
    phase: 'size_reference',
    food: 'poppy seed',
    sizeNote: '~1mm',
    imageName: 'pregnancy-week-04-approved.webp',
  },
  {
    week: 5,
    title: 'As small as an apple seed',
    description: 'This week, the neural tube is forming, which will become your baby\'s brain and spinal cord. Another amazing detail is that the early heart tube starts developing now and will begin pulsing very soon.',
    phase: 'size_reference',
    food: 'apple seed',
    sizeNote: '~2mm',
    imageName: 'pregnancy-week-05-approved.webp',
  },
  {
    week: 6,
    title: 'As small as a lentil',
    description: 'Tiny arm and leg buds are beginning to appear, and early facial features are starting to take shape. This is also around the time early circulation begins, which feels wild considering how little your baby still is.',
    phase: 'size_reference',
    food: 'lentil',
    sizeNote: '~0.6cm',
    imageName: 'pregnancy-week-06-approved.webp',
  },
  {
    week: 7,
    title: 'As small as a blueberry',
    description: 'Your baby\'s head is still much bigger than the rest of the body, which is completely normal at this stage. The very first bone tissue is beginning to form from cartilage, and early structures for the genitals are starting to develop too.',
    phase: 'size_reference',
    food: 'blueberry',
    sizeNote: '~1.2cm',
    imageName: 'pregnancy-week-07-approved.webp',
  },
  {
    week: 8,
    title: 'As small as a raspberry',
    description: 'All of the major organs and body systems are now developing, even though everything is still very small. Web-like hands and feet are visible now, and the umbilical cord is formed and carrying blood between your baby and the placenta.',
    phase: 'size_reference',
    food: 'raspberry',
    sizeNote: '~1.6cm',
    imageName: 'pregnancy-week-08-approved.webp',
  },
  {
    week: 9,
    title: 'As small as a grape',
    description: 'This is the point when the embryo officially becomes a fetus. Your baby is looking more recognizably human now, even though the head still makes up a big part of the body.',
    phase: 'size_reference',
    food: 'grape',
    sizeNote: '~2.3cm',
    imageName: 'pregnancy-week-09-approved.webp',
  },
  {
    week: 10,
    title: 'As small as a strawberry',
    description: 'Your baby\'s tiny fingers and toes are more defined now, and the limbs keep lengthening. A fun thing to picture is that little joints are developing too, so your baby is becoming more bendy and coordinated even this early.',
    phase: 'size_reference',
    food: 'strawberry',
    sizeNote: '~3.1cm',
    imageName: 'pregnancy-week-10-approved.webp',
  },
  {
    week: 11,
    title: 'As small as a fig',
    description: 'At this stage, your baby\'s organs, nerves, and muscles are starting to work together more. This is one of those weeks where development feels less like "pieces forming" and more like a tiny body beginning to function.',
    phase: 'size_reference',
    food: 'fig',
    sizeNote: '~4.1cm',
    imageName: 'pregnancy-week-11-approved.webp',
  },
  {
    week: 12,
    title: 'As small as a lime',
    description: 'All the major organs, limbs, bones, and muscles are present now and will keep maturing from here. Your baby is already swallowing amniotic fluid and peeing it back out, which surprises a lot of first-time moms.',
    phase: 'size_reference',
    food: 'lime',
    sizeNote: '~5.4cm',
    imageName: 'pregnancy-week-12-approved.webp',
  },
  {
    week: 13,
    title: 'Your baby this week',
    description: 'Your baby is entering a stretch of steady growth now, with features becoming more proportionate over time. This is the season where the body starts catching up just a bit to that adorably oversized head.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-13-approved.webp',
  },
  {
    week: 14,
    title: 'Your baby this week',
    description: 'Your baby\'s facial muscles are developing, and subtle expressions may begin to happen. Even if you can\'t feel much yet, there is a lot of movement and practice happening inside.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-14-approved.webp',
  },
  {
    week: 15,
    title: 'Your baby this week',
    description: 'Bones continue hardening, and your baby\'s body is stretching out more. This is also a week when the overall shape starts looking less curled and more like the baby shape most moms picture.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-15-approved.webp',
  },
  {
    week: 16,
    title: 'Your baby this week',
    description: 'Your baby is getting stronger, and coordinated movements are becoming more common. Some moms start feeling tiny flutters soon around this point, especially if they\'ve been pregnant before.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-16-approved.webp',
  },
  {
    week: 17,
    title: 'Your baby this week',
    description: 'Fat stores are beginning to develop under your baby\'s skin, which will matter more and more later in pregnancy. This is one of the quiet foundation-building weeks that helps your baby prepare for life outside the womb.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-17-approved.webp',
  },
  {
    week: 18,
    title: 'Your baby this week',
    description: 'Your baby\'s ears are now in their final position on the head, and the inner ear structures that make hearing possible are developing rapidly. While your baby can\'t quite hear you yet, the foundation for hearing is being laid — and in a few weeks, the outside world will start reaching your baby in a new way.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-18-approved.webp',
  },
  {
    week: 19,
    title: 'Your baby this week',
    description: 'Your baby\'s skin is protected by a waxy coating called vernix, which helps shield it from constant exposure to amniotic fluid. It\'s one of those details most moms never think about, but it plays a really important protective role.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-19-approved.webp',
  },
  {
    week: 20,
    title: 'Your baby this week',
    description: 'At this halfway point, your baby is very recognizable, with well-formed limbs and features. Many moms love this stage because baby is big enough to picture clearly but still has plenty of room to move around.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-20-anchor-approved.webp',
  },
  {
    week: 21,
    title: 'Your baby this week',
    description: 'Your baby is getting bigger fast and may begin having more noticeable patterns of movement. This is also a time of active brain growth, which is a big part of what makes the second half of pregnancy so dynamic.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-21-approved.webp',
  },
  {
    week: 22,
    title: 'Your baby this week',
    description: 'Your baby\'s features are becoming more distinct, and movements can start feeling stronger. Tiny practice breaths may begin too, even though the lungs are not ready for life outside the womb yet.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-22-approved.webp',
  },
  {
    week: 23,
    title: 'Your baby this week',
    description: 'Your baby\'s body is getting better and better at the work that will matter after birth — little by little, the lungs are preparing for the day they\'ll take that first breath. This is often described as a milestone week because so many important systems are maturing.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-23-approved.webp',
  },
  {
    week: 24,
    title: 'Your baby this week',
    description: 'Your baby is growing steadily and becoming more responsive to sound and touch. Sleep and wake cycles are also starting to become more defined, which is why movement may begin to feel a little more patterned.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-24-approved.webp',
  },
  {
    week: 25,
    title: 'Your baby this week',
    description: 'Your baby\'s skin is still thin, but the body is gradually filling out more. The nervous system is maturing too, which helps movements become stronger and more purposeful.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-25-approved.webp',
  },
  {
    week: 26,
    title: 'Your baby this week',
    description: 'Your baby is practicing important skills like sucking and swallowing. These little rehearsal steps matter because they help prepare for feeding after birth.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-26-approved.webp',
  },
  {
    week: 27,
    title: 'Your baby this week',
    description: 'Your baby\'s brain and lungs are still maturing in a big way as the third trimester begins. This is a growth-and-prep stage where the body is getting more coordinated for the weeks ahead.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-27-approved.webp',
  },
  {
    week: 28,
    title: 'Your baby this week',
    description: 'Your baby is starting to put on weight more quickly now. You may also notice stronger kicks and stretches, partly because your baby is bigger and partly because movement patterns are getting more organized.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-28-approved.webp',
  },
  {
    week: 29,
    title: 'Your baby this week',
    description: 'In the last couple months of pregnancy, your baby gains weight fast, and a big chunk of birth weight is added during this season. Your body is working hard to support that growth.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-29-approved.webp',
  },
  {
    week: 30,
    title: 'Your baby this week',
    description: 'Your baby is continuing to gain fat, which helps smooth the skin and support temperature regulation after birth. There is less room than before, so movements may feel bigger even if they are less acrobatic.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-30-approved.webp',
  },
  {
    week: 31,
    title: 'Your baby this week',
    description: 'Your baby has most of their parts in place and is now focused on growing and maturing — less about building new pieces, more about getting stronger and more ready for the outside world.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-31-approved.webp',
  },
  {
    week: 32,
    title: 'Your baby this week',
    description: 'Your baby is practicing breathing movements and continuing to build body fat. Even though those breaths are just practice, they are part of preparing the lungs and chest for life after birth.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-32-approved.webp',
  },
  {
    week: 33,
    title: 'Your baby this week',
    description: 'Your baby is still growing steadily and may gain around a quarter to half a pound per week as you get closer to your due date. That rapid growth is one reason everything can suddenly feel tighter in your belly around now.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-33-approved.webp',
  },
  {
    week: 34,
    title: 'Your baby this week',
    description: 'Your baby\'s skin is getting smoother as more fat is stored under the surface. Fingernails are also continuing to grow, which is one of those tiny details that makes babies feel more and more "finished."',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-34-approved.webp',
  },
  {
    week: 35,
    title: 'Your baby this week',
    description: 'Your baby is getting snug in the uterus now, and there is much less extra room for dramatic movement. Many babies settle more into a head-down position around this stage if they have not already.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-35-approved.webp',
  },
  {
    week: 36,
    title: 'Your baby this week',
    description: 'Your baby is looking rounder and fuller now, with more fat on the body and less wrinkling of the skin. This is also a week when the overall position in the uterus starts to matter more as birth gets closer.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-36-approved.webp',
  },
  {
    week: 37,
    title: 'Your baby this week',
    description: 'Your baby is considered early term now, and many important systems are very close to ready. Brain and lung development are still continuing, which is a helpful reminder that these last weeks still matter.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-37-approved.webp',
  },
  {
    week: 38,
    title: 'Your baby this week',
    description: 'Your baby keeps fine-tuning important skills like swallowing, breathing motions, and body temperature regulation. Even when everything feels "done," your baby is still using this time to get stronger and more prepared.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-38-approved.webp',
  },
  {
    week: 39,
    title: 'Your baby this week',
    description: 'Your baby is considered full term this week, and the body is built for life on the outside. A sweet detail is that the brain is still doing a huge amount of development right up through the end, even when baby looks fully ready to meet you.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-39-approved.webp',
  },
  {
    week: 40,
    title: 'Your baby this week',
    description: 'You\'ve made it to your due date week. Your baby is fully developed and ready to meet you. The brain and lungs finish their final preparations now, and your baby is settled into position for birth. You\'re so close to holding your little one.',
    phase: 'cross_section',
    food: null,
    sizeNote: null,
    imageName: 'pregnancy-week-40-approved.webp',
  },
];

/**
 * Lookup map for quick access by week number.
 */
export const BABY_DEVELOPMENT_BY_WEEK: Record<number, BabyDevEntry> = Object.fromEntries(
  BABY_DEVELOPMENT_DATA.map(entry => [entry.week, entry])
);

/**
 * Get baby development data for a specific week (4-40).
 * Returns undefined for weeks outside the range.
 */
export function getBabyDevData(week: number): BabyDevEntry | undefined {
  return BABY_DEVELOPMENT_BY_WEEK[week];
}