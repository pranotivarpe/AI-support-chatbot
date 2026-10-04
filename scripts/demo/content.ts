// Knowledge base for the fictional demo business used on the landing page.

export const BUSINESS = "Brightside Dental Studio";

/** Rendered into a multi-page PDF so the demo shows page-level citations. */
export const HANDBOOK_PAGES: { heading: string; body: string }[] = [
  {
    heading: "Brightside Dental Studio: Patient Handbook",
    body: `Welcome to Brightside Dental Studio. This handbook explains how appointments, payments and treatments work at our clinic.

Appointments
New patients can book online at any time or by calling (415) 555-0142 during opening hours. Your first visit takes about 60 minutes and includes a full exam, digital X-rays and a cleaning.

Please arrive 10 minutes early for your first appointment to complete the health questionnaire. Bring a photo ID and your insurance card if you have one.

Cancellation policy
We ask for at least 24 hours notice if you need to cancel or reschedule. Appointments cancelled with less than 24 hours notice, or missed without notice, are charged a $45 late cancellation fee. The fee is waived once per year and in case of emergencies.

Running late
If you are more than 15 minutes late we may need to reschedule so that we can stay on time for other patients.`,
  },
  {
    heading: "Payments, insurance and financing",
    body: `Insurance
We are in-network with Delta Dental PPO, Cigna Dental PPO, MetLife PDP and Aetna PPO. We are happy to submit claims to most other PPO plans as an out-of-network provider. We do not accept HMO or DHMO plans.

Payment
Payment for your portion is due at the time of service. We accept Visa, Mastercard, American Express, Apple Pay, Google Pay, HSA and FSA cards. We do not accept personal checks.

Financing
For treatment over $500 we offer 0% interest financing for 12 months through CareCredit and Sunbit. Approval takes about 2 minutes at the front desk and does not affect your credit score for the pre-check.

Membership plan (no insurance)
Patients without insurance can join the Brightside Membership Plan for $29 per month or $299 per year. It includes two cleanings and exams per year, all routine X-rays, one emergency exam, and 20% off all other treatments including whitening and Invisalign.`,
  },
  {
    heading: "Treatments and aftercare",
    body: `Teeth whitening
We offer in-office Zoom whitening ($450, about 90 minutes, results up to 8 shades lighter) and take-home custom whitening trays ($250, results in 2 weeks). Avoid coffee, red wine and tea for 48 hours after whitening.

Invisalign
Invisalign clear aligners start at $3,900 and treatment usually takes 6 to 18 months. The initial consultation and 3D scan are free.

After a filling
If you received numbing, avoid eating until the numbness wears off, usually 2 to 3 hours. Mild sensitivity to cold for a few days is normal.

After an extraction
Bite on the gauze for 30 minutes. Do not use a straw, smoke or rinse vigorously for 24 hours. Call us if bleeding continues after 4 hours.

Dental emergencies
For a knocked-out tooth, severe pain or swelling, call (415) 555-0142. We keep same-day emergency slots open every weekday. After hours, follow the instructions on our voicemail to reach the on-call dentist.`,
  },
];

export const TEXT_SOURCES: { title: string; text: string }[] = [
  {
    title: "Opening hours & location",
    text: `Brightside Dental Studio is located at 820 Valencia Street, San Francisco, CA 94110, between 19th and 20th Street.

Opening hours:
- Monday to Thursday: 8:00 am to 6:00 pm
- Friday: 8:00 am to 3:00 pm
- Saturday: 9:00 am to 1:00 pm (cleanings and emergencies only, every other Saturday)
- Sunday: closed

Parking: Free 2-hour street parking is available on Valencia Street and there is a paid public garage at 21st and Bartlett Street. We validate garage parking for up to 2 hours.

Public transport: We are a 4 minute walk from the 16th Street Mission BART station. Muni bus lines 14 and 49 stop at Mission and 19th.

The clinic is wheelchair accessible with a ground-floor entrance and an accessible restroom.`,
  },
  {
    title: "Services & prices",
    text: `Prices for patients without insurance (self-pay). Insured patients usually pay less depending on their plan.

- New patient exam, X-rays and cleaning: $189
- Routine cleaning (adult): $120
- Children's cleaning and exam (under 14): $85
- Deep cleaning (scaling and root planing), per quadrant: $220
- Tooth-colored filling: from $160
- Root canal (front tooth): from $950
- Porcelain crown: from $1,250
- Simple extraction: from $195
- Emergency exam with X-ray: $95
- In-office Zoom whitening: $450
- Custom take-home whitening trays: $250
- Invisalign: from $3,900 (free consultation)
- Night guard for teeth grinding: $380

We treat children from age 3 and up. Our dentists are Dr. Maya Chen (general and cosmetic dentistry), Dr. Luis Ortega (root canals and implants) and hygienists Priya and Sam.`,
  },
  {
    title: "Frequently asked questions",
    text: `Do you accept new patients?
Yes, we are currently accepting new patients of all ages from 3 years old.

Do you offer sedation for anxious patients?
Yes. We offer nitrous oxide (laughing gas) for $75 per visit. Let us know when booking and we will schedule extra time. We also have noise-cancelling headphones and Netflix on ceiling screens.

Do you do dental implants?
Yes, Dr. Luis Ortega places and restores dental implants in-house. Implant consultations are free and include a 3D CBCT scan.

How often should I get a cleaning?
Most adults should have a cleaning and exam every 6 months. Patients with gum disease may need a cleaning every 3 to 4 months.

Can I get a cleaning on the same day as my first exam?
Yes, the new patient appointment includes the exam, X-rays and a regular cleaning in one 60 minute visit.

Do you speak Spanish?
Yes, Dr. Luis Ortega and our front desk coordinator Ana are fluent in Spanish. Hablamos español.`,
  },
];

/** Realistic visitor questions used to generate the demo analytics. */
export const DEMO_QA: {
  q: string;
  a: string;
  cite?: { title: string; page?: number; snippet: string }[];
  fallback?: boolean;
}[] = [
  {
    q: "What time are you open on Saturday?",
    a: "On Saturdays we're open **9:00 am to 1:00 pm**, every other Saturday, for cleanings and emergencies only [1].",
    cite: [{ title: "Opening hours & location", snippet: "Saturday: 9:00 am to 1:00 pm (cleanings and emergencies only, every other Saturday)" }],
  },
  {
    q: "Do you take Delta Dental?",
    a: "Yes, we're **in-network with Delta Dental PPO**, as well as Cigna Dental PPO, MetLife PDP and Aetna PPO [1]. Note that we don't accept HMO or DHMO plans [1].",
    cite: [{ title: "Brightside Patient Handbook", page: 2, snippet: "We are in-network with Delta Dental PPO, Cigna Dental PPO, MetLife PDP and Aetna PPO." }],
  },
  {
    q: "How much is teeth whitening?",
    a: "We have two options [1]:\n\n- **In-office Zoom whitening: $450**, about 90 minutes, up to 8 shades lighter\n- **Custom take-home trays: $250**, results in about 2 weeks",
    cite: [{ title: "Brightside Patient Handbook", page: 3, snippet: "We offer in-office Zoom whitening ($450, about 90 minutes, results up to 8 shades lighter)…" }],
  },
  {
    q: "what's the cancellation policy",
    a: "Please give us at least **24 hours notice** to cancel or reschedule. Late cancellations or no-shows are charged a **$45 fee**, which is waived once per year and for emergencies [1].",
    cite: [{ title: "Brightside Patient Handbook", page: 1, snippet: "We ask for at least 24 hours notice if you need to cancel or reschedule…" }],
  },
  {
    q: "I don't have insurance, how much is a first visit?",
    a: "A new patient visit (exam, X-rays and cleaning) is **$189** self-pay [1]. You could also join our **Membership Plan for $29/month**, which covers two cleanings and exams per year plus 20% off other treatments [2].",
    cite: [
      { title: "Services & prices", snippet: "New patient exam, X-rays and cleaning: $189" },
      { title: "Brightside Patient Handbook", page: 2, snippet: "Patients without insurance can join the Brightside Membership Plan for $29 per month…" },
    ],
  },
  {
    q: "Is there parking nearby?",
    a: "Yes, there's free 2-hour street parking on Valencia Street, and a paid garage at 21st and Bartlett. **We validate up to 2 hours** of garage parking [1].",
    cite: [{ title: "Opening hours & location", snippet: "We validate garage parking for up to 2 hours." }],
  },
  {
    q: "Do you offer payment plans for Invisalign?",
    a: "Yes. Invisalign starts at **$3,900** with a free consultation [1], and treatment over $500 can be financed at **0% interest for 12 months** through CareCredit or Sunbit [2].",
    cite: [
      { title: "Brightside Patient Handbook", page: 3, snippet: "Invisalign clear aligners start at $3,900 and treatment usually takes 6 to 18 months." },
      { title: "Brightside Patient Handbook", page: 2, snippet: "For treatment over $500 we offer 0% interest financing for 12 months through CareCredit and Sunbit." },
    ],
  },
  {
    q: "I'm really nervous about dentists, can you help?",
    a: "Absolutely. We offer **nitrous oxide (laughing gas) for $75** per visit, and we'll schedule extra time if you mention it when booking. We also have noise-cancelling headphones and Netflix on ceiling screens [1].",
    cite: [{ title: "Frequently asked questions", snippet: "We offer nitrous oxide (laughing gas) for $75 per visit…" }],
  },
  {
    q: "My tooth got knocked out playing soccer what do I do",
    a: "Please **call us right away at (415) 555-0142**. We keep same-day emergency slots open every weekday, and after hours our voicemail explains how to reach the on-call dentist [1].",
    cite: [{ title: "Brightside Patient Handbook", page: 3, snippet: "For a knocked-out tooth, severe pain or swelling, call (415) 555-0142…" }],
  },
  {
    q: "Do you see kids?",
    a: "Yes! We treat children from **age 3 and up** [1]. A children's cleaning and exam (under 14) is **$85** self-pay [1].",
    cite: [{ title: "Services & prices", snippet: "Children's cleaning and exam (under 14): $85" }],
  },
  { q: "Do you do botox for TMJ?", a: "", fallback: true },
  { q: "Can I bring my dog to the appointment?", a: "", fallback: true },
  { q: "Are you open on Christmas Eve?", a: "", fallback: true },
];

export const DEMO_NAMES = [
  ["Olivia Martinez", "olivia.m"],
  ["James Wilson", "jwilson"],
  ["Sophia Nguyen", "sophia.nguyen"],
  ["Daniel Kim", "dkim"],
  ["Emma Johnson", "emma.j"],
  ["Noah Patel", "noahp"],
  ["Ava Thompson", "ava.thompson"],
  ["Lucas Garcia", "lucas.g"],
  ["Mia Robinson", "mia.rob"],
  ["Ethan Brown", "ebrown"],
  ["Isabella Lee", "bella.lee"],
  ["Liam Davis", "liam.d"],
];
