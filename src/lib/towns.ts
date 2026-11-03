// Service-area pages for local search (/moving-help/[town]).
// Each town has its own copy about local housing and moving conditions so the
// pages are genuinely useful, not the same text with the city name swapped.
// Keep claims general and verifiable; never invent reviews or customer stories.

export type Town = {
  slug: string;
  name: string;
  county: "Essex" | "Union";
  /** One-line summary used in the meta description and the hub list. */
  blurb: string;
  intro: string;
  /** Local moving considerations, shown as a bulleted list. */
  local: string[];
  /** Neighborhoods, sections, or landmarks people search with. */
  areas: string[];
  faqs: [string, string][];
  nearby: string[];
};

export const HOME_BASE = "Irvington";

export const TOWNS: Town[] = [
  {
    slug: "irvington-nj",
    name: "Irvington",
    county: "Essex",
    blurb: "Our home base. Local helpers for loading, unloading, and heavy lifting anywhere in Irvington.",
    intro:
      "LiftCrew is based in Irvington, so this is the town we know best. Much of Irvington's housing is two- and three-family homes and walk-up apartment buildings, which means narrow stairways, tight landings, and furniture that has to come down two or three flights. That's exactly the kind of job our helpers are here for.",
    local: [
      "Multi-family houses often have steep interior stairs. We plan the order items come out so nothing gets wedged on a landing. Renting furniture pads with your truck helps protect banisters and walls.",
      "Street parking along Springfield Avenue, Clinton Avenue, and the side streets fills up fast. Reserve a spot for your rental truck close to the door if you can; a shorter carry means fewer billed hours.",
      "Moving between floors in the same building, or helping a family member move a few blocks away? That's labor only, and it's a great fit for a 2-hour booking.",
    ],
    areas: [
      "Upper Irvington",
      "Irvington Center",
      "Springfield Avenue corridor",
      "Clinton Avenue",
      "Near Irvington Park",
    ],
    faqs: [
      [
        "How quickly can you get to an Irvington job?",
        "Irvington is our home base, so it's usually the easiest place for us to fit in a same-week or short-notice job. Send a quote request and we'll tell you the earliest time we have.",
      ],
      [
        "Can you just help me move furniture up or down the stairs?",
        "Yes. Many Irvington jobs are only stairs work: getting a couch, dresser, or mattress between floors of a multi-family house. Book the 2-hour minimum and we'll get it done.",
      ],
    ],
    nearby: ["newark-nj", "maplewood-nj", "union-nj", "hillside-nj"],
  },
  {
    slug: "newark-nj",
    name: "Newark",
    county: "Essex",
    blurb: "Help loading trucks and moving in or out of Newark apartments, walk-ups, and high-rises.",
    intro:
      "Newark moves come in every shape: high-rise apartments downtown, row houses and multi-family homes in the Ironbound, and single-family houses in Forest Hill and Vailsburg. Our helpers load and unload your rental truck, carry boxes and furniture through tight hallways, and work around elevator schedules so your move stays on time.",
    local: [
      "Many downtown and University Heights buildings require you to reserve the service elevator or loading area. Book it before you book helpers, and tell us your time window so we can plan around it.",
      "Ironbound streets are narrow and parking is tight. Park the truck as close as you legally can; we'll handle the carry from the door to the truck.",
      "Student moves near Rutgers-Newark and NJIT are often small. A 2-hour booking with two helpers is usually enough to load a studio or one-bedroom.",
    ],
    areas: [
      "Downtown",
      "Ironbound",
      "Forest Hill",
      "Vailsburg",
      "Weequahic",
      "University Heights",
      "North Ward",
      "South Ward",
    ],
    faqs: [
      [
        "Do you work in Newark high-rise buildings?",
        "Yes. We'll follow your building's move-in rules, including elevator reservations, padding requirements, and move times. Check with your management office for a certificate of insurance requirement before booking.",
      ],
      [
        "Can you help unload a container or portable storage unit in Newark?",
        "Yes. We load and unload rental trucks, trailers, and portable storage containers. You arrange the container and its delivery; we provide the labor.",
      ],
    ],
    nearby: ["irvington-nj", "east-orange-nj", "hillside-nj", "orange-nj"],
  },
  {
    slug: "union-nj",
    name: "Union",
    county: "Union",
    blurb: "Moving labor for Union Township homes: loading, unloading, and heavy furniture.",
    intro:
      "Union Township is mostly single-family homes, from Cape Cods and Colonials to split-levels, plus apartment complexes near Route 22 and Morris Avenue. House moves here often mean a basement full of storage and a few heavy pieces like dressers, sectionals, and appliances. Our helpers take care of the lifting while you handle the truck.",
    local: [
      "Driveways make loading easier than in the cities. Back the truck up to the door and we can move faster, which keeps your hours down.",
      "Basements and attics are common in Union homes. Tell us about them in your quote request so we send enough helpers.",
      "Moving near Kean University? Dorm and apartment moves are usually quick. Two helpers for 2 hours covers most of them.",
    ],
    areas: [
      "Vauxhall",
      "Townley",
      "Connecticut Farms",
      "Union Center",
      "Near Kean University",
      "Morris Avenue",
      "Stuyvesant Avenue",
    ],
    faqs: [
      [
        "Can you empty a basement or garage in Union?",
        "Yes, as long as it's moving items to your truck, a container, or elsewhere on the property. We don't haul items away or take them to the dump; that's transport, and LiftCrew is labor only.",
      ],
      [
        "Do you move appliances?",
        "We can carry washers, dryers, and refrigerators that are already disconnected. We don't do plumbing, gas, or electrical disconnects.",
      ],
    ],
    nearby: ["irvington-nj", "hillside-nj", "maplewood-nj", "newark-nj"],
  },
  {
    slug: "maplewood-nj",
    name: "Maplewood",
    county: "Essex",
    blurb: "Careful moving help for Maplewood's older homes, narrow stairs, and long carries.",
    intro:
      "Maplewood's older Colonials, Tudors, and Victorians are beautiful, but they're tough to move out of: narrow stairways, tight turns, plaster walls, and porches with steps. Our helpers wrap furniture in the pads you rent, mind door frames, and take their time on the tricky parts so your move goes smoothly.",
    local: [
      "Older homes often have staircases that big box springs and sectionals don't fit through. Measure tight spots ahead of time and let us know; we'll plan the route out.",
      "Many streets near Maplewood Village and the train station have limited parking. A spot near the door saves time on the carry.",
      "Commuters moving in on the Midtown Direct line often book unload-only jobs on weekends. Tell us your truck's arrival time and we'll meet it.",
    ],
    areas: [
      "Maplewood Village",
      "Hilton",
      "Near the Maplewood train station",
      "Springfield Avenue",
      "Near South Mountain Reservation",
    ],
    faqs: [
      [
        "Will you protect my floors and walls?",
        "Our helpers take care around door frames, banisters, and floors. For extra protection, rent furniture pads with your truck and lay floor runners over hardwood before we arrive.",
      ],
      [
        "Can you take apart and reassemble furniture?",
        "Yes. Basic furniture assembly and disassembly, like bed frames, tables, and shelving, is part of the labor we provide. Let us know in your quote request.",
      ],
    ],
    nearby: ["irvington-nj", "south-orange-nj", "union-nj", "newark-nj"],
  },
  {
    slug: "east-orange-nj",
    name: "East Orange",
    county: "Essex",
    blurb: "Helpers for East Orange apartment and walk-up moves: loading, unloading, and stairs.",
    intro:
      "East Orange has some of the densest apartment housing in Essex County, with garden apartments, elevator buildings, and plenty of walk-ups. That means stairs, long hallways, and limited curb space. Our helpers move boxes and furniture efficiently so you're not paying for extra hours.",
    local: [
      "Walk-up buildings mean every item goes up or down the stairs by hand. Two helpers can usually handle a one-bedroom in a 2-hour booking; add a third for larger apartments or upper floors.",
      "Main Street and Central Avenue get busy. Plan your truck parking ahead, especially on weekdays.",
      "Many buildings have set move-in hours and rules about using the front entrance or a side door. Ask your super or management office and tell us the window.",
    ],
    areas: ["Ampere", "Elmwood", "Doddtown", "Upsala", "Near Brick Church station", "Main Street", "Central Avenue"],
    faqs: [
      [
        "How many helpers do I need for a walk-up apartment?",
        "For a studio or one-bedroom, two helpers is usually right. For two bedrooms or more, or a third floor and up, three helpers will save you time.",
      ],
      [
        "Can you just unload my truck at my new East Orange apartment?",
        "Yes. Unload-only jobs are common. You drive the truck, and we meet you at the new place and carry everything in.",
      ],
    ],
    nearby: ["newark-nj", "orange-nj", "south-orange-nj", "irvington-nj"],
  },
  {
    slug: "hillside-nj",
    name: "Hillside",
    county: "Union",
    blurb: "Local moving labor in Hillside: house moves, truck loading, and heavy items.",
    intro:
      "Hillside sits right between Irvington, Newark, Union, and Elizabeth, so it's a quick trip for our crew. Most homes are single-family houses with driveways, which makes loading straightforward. Most of the work is the heavy lifting: beds, dressers, and boxes from the upstairs bedrooms.",
    local: [
      "With driveway access, a rental truck can usually park right at the door. That keeps the carry short and the job quick.",
      "Hillside homes often have finished basements, and basement stairs are usually narrower than the main staircase. Mention it in your quote so we send the right size crew and plan how big pieces come up.",
      "Moving between Hillside and a neighboring town? That's fine, as long as both addresses are in New Jersey and you handle the driving.",
    ],
    areas: ["Near Hillside Avenue", "Liberty Avenue", "Near Route 22", "Near Elizabeth border"],
    faqs: [
      [
        "Can you help me load a truck in Hillside and unload it in another town?",
        "Yes. You drive the truck between the two addresses, and we can meet you at both. Both addresses need to be in New Jersey.",
      ],
      [
        "Is there a minimum?",
        "Every booking is at least 2 hours. Short jobs, like moving a few heavy items, are still priced at the 2-hour minimum.",
      ],
    ],
    nearby: ["irvington-nj", "union-nj", "newark-nj", "maplewood-nj"],
  },
  {
    slug: "south-orange-nj",
    name: "South Orange",
    county: "Essex",
    blurb: "Moving help in South Orange for houses, apartments, and Seton Hall students.",
    intro:
      "South Orange moves range from large older homes on hilly streets to apartments near South Orange Avenue and off-campus rentals near Seton Hall University. Hills and front steps add effort to every carry, so having strong helpers who've done it before makes a real difference.",
    local: [
      "Steep driveways and front steps are common. We'll carry items to the truck safely, even when it can't park right at the door, and we take heavy pieces down hills slowly and with two people.",
      "Student move-in and move-out weeks around Seton Hall get busy. Book early if your move falls near the start or end of a semester.",
      "Apartment buildings near the train station often have limited loading space. Check your building's rules before moving day.",
    ],
    areas: ["South Orange Village", "Near Seton Hall University", "South Orange Avenue", "Montrose Park", "Newstead"],
    faqs: [
      [
        "Do you help students moving out of Seton Hall housing?",
        "Yes. We load your rental truck or container, or carry items to your car. Small student moves usually fit in the 2-hour minimum.",
      ],
      [
        "Can you move a piano?",
        "We can move small upright pianos with enough helpers, but not grand pianos, which need specialized movers and equipment. Tell us the piano type in your quote request.",
      ],
    ],
    nearby: ["maplewood-nj", "orange-nj", "east-orange-nj", "irvington-nj"],
  },
  {
    slug: "orange-nj",
    name: "Orange",
    county: "Essex",
    blurb: "Labor-only moving help in the City of Orange: apartments, multi-family homes, and stairs.",
    intro:
      "The City of Orange has a mix of multi-family homes, older apartment buildings, and Victorian houses. Many of them have narrow stairs and tight turns. Our helpers handle the loading, unloading, and stairs so you can focus on the rest of your move.",
    local: [
      "Two- and three-family houses are common, so expect stairs. Tell us which floor you're on, and whether there's a back staircase, when you request a quote. It changes how many helpers we suggest.",
      "Main Street and the streets near the Orange and Highland Avenue train stations get congested. Plan where the truck will park ahead of time.",
      "Moving out of a unit while your landlord is showing it? We can work in a set time window. Just let us know.",
    ],
    areas: ["Main Street", "Near Orange station", "Near Highland Avenue station", "Valley", "Central Avenue"],
    faqs: [
      [
        "Do you bring dollies?",
        "Not always, so plan on it: add a dolly and furniture pads to your truck rental. They speed up the job and cut your billed hours.",
      ],
      [
        "Can you help with packing too?",
        "Yes. Packing and unpacking are part of the labor we provide. You supply the boxes and tape, and we'll pack carefully and label as we go.",
      ],
    ],
    nearby: ["east-orange-nj", "south-orange-nj", "newark-nj", "maplewood-nj"],
  },
];

export const TOWN_SLUGS = TOWNS.map((t) => t.slug);

export function getTown(slug: string): Town | undefined {
  return TOWNS.find((t) => t.slug === slug);
}
