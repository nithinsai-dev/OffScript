import type { EventDetail } from '@/types/event'

export const FIXTURE_EVENTS: EventDetail[] = [
  {
    id: 'campus-01',
    name: 'HackSprint: 24-Hour Campus Hackathon',
    blurb: 'Team up, build something cool in 24 hours, and pitch to founders and engineers.',
    cover_image_url:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop',
    cover_image_alt: 'Students collaborating in an engineering lab',
    banner_image_url:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1600&auto=format&fit=crop',
    banner_image_alt: 'Hackathon banner',
    category: 'TECH',
    tags: ['Web3', 'AI', 'Fullstack', 'Beginner Friendly'],
    event_type: 'HACKATHON',
    event_mode: 'OFFLINE',
    event_status: 'SCHEDULED',
    is_featured: true,
    is_technical: true,
    price: 0,
    is_per_head: true,
    min_teamsize: 2,
    max_teamsize: 4,
    total_seats: 120,
    seats_filled: 108,
    registration_status: 'OPEN',
    registration_deadline: '2026-11-20T23:59:59+05:30',
    schedule_summary: {
      start_date: '2026-11-28',
      start_time: '09:00',
      end_date: '2026-11-29',
      end_time: '12:00',
    },
    description:
      'HackSprint is our flagship annual student hackathon.\n\nWhether you are building your very first web app or experimenting with edge AI models, you will find mentors, high-speed campus Wi-Fi, and endless snacks to keep you fueled all weekend.',
    highlights: [
      '24 hours of non-stop building with dedicated mentors',
      'Free meals, coffee, and energy drinks provided',
      'Direct interview opportunities with sponsoring startups',
      'Workshops on deploying fullstack apps to production',
    ],
    what_to_expect: [
      'Check-in starts at 8:30 AM Saturday in the Main Auditorium',
      'Problem statements announced at 10:00 AM',
      'Mid-hack checkpoint with technical mentors at 8:00 PM',
      'Project demos and jury presentations Sunday morning',
    ],
    eligibility: [
      'Open to all currently enrolled college students',
      'Valid student ID required at check-in',
      'Inter-college teams are welcome',
    ],
    prerequisites: [
      'Bring your own laptop and charging gear',
      'Basic knowledge of Git and your chosen tech stack',
    ],
    rules: [
      'All code must be written during the hackathon hours',
      'Open source libraries and public APIs are permitted',
      'Treat fellow participants and volunteers with respect',
    ],
    prizes: [
      {
        rank: 1,
        title: 'First Place Winner',
        amount: 50000,
        description: 'Cash prize plus cloud credits and fast-track interviews.',
      },
      {
        rank: 2,
        title: 'First Runner Up',
        amount: 25000,
        description: 'Cash prize and tech gear bundle.',
      },
      {
        rank: 3,
        title: 'Community Favorite',
        amount: 10000,
        description: 'Voted best demo by student attendees.',
      },
    ],
    faqs: [
      {
        question: 'Is this hackathon beginner friendly?',
        answer: 'Yes! We have dedicated beginner tracks and student mentors on site to help you debug.',
      },
      {
        question: 'Do I need a team before registering?',
        answer: 'You can register solo or with a team. We host a team-matching mixer right before kickoff.',
      },
    ],
    schedules: [
      {
        event_date: '2026-11-28',
        start_time: '09:00',
        end_time: '18:00',
        venue: 'Student Activity Center, Level 2',
      },
      {
        event_date: '2026-11-29',
        start_time: '09:00',
        end_time: '12:00',
        venue: 'Main Auditorium Stage',
      },
    ],
    organizers: [
      {
        id: 'org-01',
        name: 'Campus Developer Student Club',
        org_type: 'CLUB',
      },
    ],
    coordinators: [
      {
        id: 'coord-01',
        name: 'Rohan Sharma',
        role: 'Lead Student Organizer',
        contact: 'rohan@college.edu',
      },
    ],
  },
  {
    id: 'campus-02',
    name: 'Acoustic Unplugged: Sunset Amphitheatre Jam',
    blurb: 'An open-air evening of indie music, acoustic covers, and original songwriting.',
    cover_image_url:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
    cover_image_alt: 'Acoustic guitar performance under festival lights',
    banner_image_url:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&auto=format&fit=crop',
    category: 'MUSIC',
    tags: ['Acoustic', 'Live Music', 'Open Mic', 'Band'],
    event_type: 'CONCERT',
    event_mode: 'OFFLINE',
    event_status: 'SCHEDULED',
    is_featured: true,
    is_technical: false,
    price: 150,
    is_per_head: true,
    min_teamsize: 1,
    max_teamsize: 4,
    total_seats: 250,
    seats_filled: 215,
    registration_status: 'OPEN',
    registration_deadline: '2026-11-15T18:00:00+05:30',
    schedule_summary: {
      start_date: '2026-11-21',
      start_time: '17:30',
      end_date: '2026-11-21',
      end_time: '21:30',
    },
    description:
      'Grab your friends and head to the campus open-air amphitheatre as the sun sets.\n\nEnjoy acoustic sets from college bands across the city, delicious food trucks, and an open mic segment for solo acoustic artists.',
    highlights: [
      'Live performances by 6 student indie bands',
      'Food stalls and campus merchandise popups',
      'Open mic registration for solo musicians',
    ],
    prizes: [
      {
        rank: 1,
        title: 'Best Acoustic Act',
        amount: 15000,
        description: 'Voted by the live student audience.',
      },
    ],
    schedules: [
      {
        event_date: '2026-11-21',
        start_time: '17:30',
        end_time: '21:30',
        venue: 'Campus Open Air Amphitheatre',
      },
    ],
    organizers: [
      {
        id: 'org-02',
        name: 'Music & Cultural Society',
        org_type: 'SOCIETY',
      },
    ],
  },
  {
    id: 'campus-03',
    name: 'Frame by Frame: Campus Street Photography',
    blurb: 'Capture hidden corners and daily student life across the campus grounds.',
    cover_image_url:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1200&auto=format&fit=crop',
    cover_image_alt: 'Vintage camera and creative photography prints',
    category: 'DESIGN',
    tags: ['Photography', 'Visual Arts', 'Street', 'Editing'],
    event_type: 'WORKSHOP',
    event_mode: 'OFFLINE',
    event_status: 'SCHEDULED',
    is_featured: true,
    is_technical: false,
    price: 0,
    is_per_head: true,
    min_teamsize: 1,
    max_teamsize: 1,
    total_seats: 50,
    seats_filled: 38,
    registration_status: 'OPEN',
    registration_deadline: '2026-11-24T20:00:00+05:30',
    schedule_summary: {
      start_date: '2026-11-26',
      start_time: '15:00',
      end_date: '2026-11-26',
      end_time: '19:00',
    },
    description:
      'Join fellow photo enthusiasts for an afternoon photowalk around campus quad.\n\nLearn composition techniques from visiting photojournalists and submit your best shots for the campus gallery exhibition.',
    highlights: [
      'Interactive masterclass on manual framing and lighting',
      'Hands-on photo walk across campus',
      'Exhibition display for top 10 selections',
    ],
    prizes: [
      {
        rank: 1,
        title: 'Curator Choice Award',
        amount: 8000,
      },
    ],
    schedules: [
      {
        event_date: '2026-11-26',
        start_time: '15:00',
        end_time: '19:00',
        venue: 'Design Block Studio 3',
      },
    ],
    organizers: [
      {
        id: 'org-03',
        name: 'Fine Arts Guild',
        org_type: 'CLUB',
      },
    ],
  },
  {
    id: 'campus-04',
    name: 'RoboQuest: Autonomous Line Follower Challenge',
    blurb: 'Fast-paced robotics tournament through curves, switchbacks, and obstacle gates.',
    cover_image_url:
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop',
    cover_image_alt: 'Robotics board and sensors',
    category: 'TECH',
    tags: ['Robotics', 'Arduino', 'Sensors', 'Hardware'],
    event_type: 'TOURNAMENT',
    event_mode: 'OFFLINE',
    event_status: 'SCHEDULED',
    is_featured: false,
    is_technical: true,
    price: 300,
    is_per_head: false,
    min_teamsize: 2,
    max_teamsize: 3,
    total_seats: 40,
    seats_filled: 36,
    registration_status: 'OPEN',
    registration_deadline: '2026-11-18T18:00:00+05:30',
    schedule_summary: {
      start_date: '2026-11-23',
      start_time: '10:00',
      end_date: '2026-11-23',
      end_time: '17:00',
    },
    description:
      'Build and calibrate an autonomous mobile robot capable of navigating complex circuit tracks in record time.\n\nMicrocontrollers, IR array sensors, and custom chassis welcome.',
    highlights: [
      'High-speed precision race tracks with timing gates',
      'Testing arena open 2 hours prior to qualifiers',
    ],
    prizes: [
      {
        rank: 1,
        title: 'Fastest Lap Champion',
        amount: 20000,
      },
      {
        rank: 2,
        title: 'Design Innovation Prize',
        amount: 10000,
      },
    ],
    schedules: [
      {
        event_date: '2026-11-23',
        start_time: '10:00',
        end_time: '17:00',
        venue: 'Indoor Sports Complex, Arena 1',
      },
    ],
    organizers: [
      {
        id: 'org-04',
        name: 'Robotics & Automation Club',
        org_type: 'CLUB',
      },
    ],
  },
]
