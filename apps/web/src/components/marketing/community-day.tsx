import styles from "./community-day.module.css";

const events = [
  {
    scene: "patrol",
    time: "6:05 AM",
    dateTime: "06:05",
    title: "Patrol checkpoint scanned",
    body: "Ramesh checks in at the main gate. The control room sees the round live, with a retry at 8 for the missed terrace check.",
  },
  {
    scene: "arrival",
    time: "8:12 AM",
    dateTime: "08:12",
    title: "Sunita arrives at A-402",
    body: "Daily help attendance is logged at the gate. Aarav gets a notification and the guard sees Sunita’s verified profile.",
  },
  {
    scene: "delivery",
    time: "9:38 AM",
    dateTime: "09:38",
    title: "Delivery waiting at the gate",
    body: "Aarav taps “Leave at gate” from a meeting. The guard logs the parcel and Aarav gets a six-digit pickup code.",
  },
  {
    scene: "helpdesk",
    time: "11:15 AM",
    dateTime: "11:15",
    title: "Helpdesk request assigned",
    body: "Ravi is assigned the kitchen tap leak with a six-hour response window. Aarav can see the estimated arrival in the app.",
  },
  {
    scene: "festival",
    time: "7:30 PM",
    dateTime: "19:30",
    title: "Diwali Mela RSVPs close",
    body: "142 residents have RSVP’d. The committee exports the food count and the deposit is already reconciled.",
  },
] as const;

type Scene = (typeof events)[number]["scene"];

const art: Record<Scene, React.ReactNode> = {
  patrol: (
    <>
      <path d="M23 96V55h58v41" fill="var(--scene-paper)" />
      <path d="M17 55h70L73 41H31Z" fill="var(--scene-wash)" />
      <path d="M33 65h18v14H33zM59 65h12v31H59z" fill="var(--scene-wash)" />
      <path d="M91 96V80h9v16M100 81l47-19 3 7-50 20" fill="var(--scene-paper)" />
      <path d="m112 76 4 6m11-12 4 6m11-12 4 6" />
      <circle cx="121" cy="39" r="14" fill="var(--scene-solid)" stroke="none" />
      <path d="m115 39 4 4 8-8" stroke="white" />
      <path d="M108 31a16 16 0 0 1 25 0M112 25a21 21 0 0 1 17 0" opacity=".38" />
    </>
  ),
  arrival: (
    <>
      <path d="M28 96V43h48v53M42 43V26h45v70" fill="var(--scene-wash)" />
      <path d="M49 35h8m12 0h8M38 53h8m11 0h8M38 63h8m11 0h8M38 73h8m11 0h8" opacity=".75" />
      <path d="M47 96V84h13v12" fill="var(--scene-paper)" />
      <rect x="91" y="45" width="55" height="39" rx="6" fill="var(--scene-paper)" />
      <path d="M109 45v-5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v5" />
      <circle cx="105" cy="59" r="4" fill="var(--scene-wash)" />
      <path d="M98 73a7 7 0 0 1 14 0ZM118 57h18m-18 7h11m-11 7h7" />
      <circle cx="144" cy="80" r="10" fill="var(--scene-solid)" stroke="none" />
      <path d="m140 80 3 3 5-6" stroke="white" />
    </>
  ),
  delivery: (
    <>
      <rect x="102" y="29" width="42" height="66" rx="8" fill="var(--scene-paper)" />
      <path d="M116 36h14m-11 52h8" />
      <rect x="107" y="49" width="32" height="24" rx="4" fill="var(--scene-wash)" stroke="none" />
      <path d="M114 61h2m6 0h2m6 0h2" strokeWidth="3" />
      <path d="m27 62 31-13 32 13v26L58 101 27 88Z" fill="var(--scene-wash)" />
      <path d="m27 62 31 13 32-13M58 75v26M43 55l32 13v12l-8 3V71L35 58" />
      <path d="m35 78 11 5" opacity=".65" />
      <path d="M78 41h14m-4-4 4 4-4 4" />
    </>
  ),
  helpdesk: (
    <>
      <path d="M19 72h22V53a12 12 0 0 1 12-12h25a12 12 0 0 1 12 12v9H77v-8H54v24a8 8 0 0 1-8 8H19z" fill="var(--scene-wash)" />
      <path d="M56 41V32m-9 0h18M19 68v22M76 62h15" />
      <path d="M83 73c-4 6-6 8-6 12a6 6 0 1 0 12 0c0-4-2-6-6-12Z" fill="var(--scene-wash)" />
      <rect x="103" y="34" width="45" height="59" rx="6" fill="var(--scene-paper)" />
      <path d="M113 47h25m-25 8h14m-14 8h9" />
      <circle cx="138" cy="81" r="13" fill="var(--scene-solid)" stroke="none" />
      <path d="M138 74v7l4 3" stroke="white" />
    </>
  ),
  festival: (
    <>
      <path d="M20 40c36 17 70 17 107 0M26 43v50m95-50v50" />
      <path d="m36 47 4 12 10-8m10 3 7 12 7-11m11 0 10 9 5-12m8-3 11 6 1-10" fill="var(--scene-wash)" />
      <path d="M40 85h32a16 16 0 0 1-32 0Z" fill="var(--scene-solid)" stroke="none" />
      <path d="M56 69c-1 5-6 7-6 11a6 6 0 0 0 12 0c0-4-4-7-6-11Z" fill="var(--scene-wash)" />
      <path d="M93 66h43a5 5 0 0 1 5 5v27H98a5 5 0 0 1-5-5Z" fill="var(--scene-paper)" />
      <path d="M103 66v32m7-22h22m-22 8h16m-16 7h9" />
      <path d="M145 35v12m-6-6h12M38 26v8m-4-4h8" opacity=".65" />
    </>
  ),
};

export function CommunityDay() {
  return (
    <section aria-labelledby="community-day-title" className="landing-gutter py-20 sm:py-28">
      <div id="admin" className="mx-auto max-w-[1180px] scroll-mt-5">
        <h2 id="community-day-title" className="max-w-2xl text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[46px]">
          Quietly working,<br />{" "}
          <span className="font-display font-normal italic text-brand-700">from gate to ledger.</span>
        </h2>
        <p className="mt-4 max-w-xl text-body leading-relaxed text-ink-soft">
          Follow a Tuesday at Verdant Heights, from the first patrol check to the evening’s Diwali Mela preparations.
        </p>
        <ol aria-label="A day in the community" className={styles.timeline}>
          {events.map((event) => (
            <li key={event.scene} data-scene={event.scene} className={styles.event}>
              <div className={styles.illustration} aria-hidden="true">
                <svg className={styles.art} viewBox="0 0 168 112" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                  <path d="M13 101h142" opacity=".25" />
                  {art[event.scene]}
                </svg>
              </div>
              <div className={styles.eventHeading}>
                <time dateTime={event.dateTime} className={styles.time}>{event.time}</time>
                <h3 className="mt-2.5 text-section font-semibold leading-snug text-ink">{event.title}</h3>
              </div>
              <p className={styles.description}>{event.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
