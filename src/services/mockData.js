// Sample mock data simulating your PostgreSQL/MySQL backend tables

export const MOCK_TRIPS = [
  {
    id: 101,
    departure: "Tunis",
    arrival: "Sousse",
    date: "2026-11-18",
    time: "08:30 AM",
    price: "25.00 TND",
    busId: "BUS-04 (Mercedes Tourismo)",
    status: "On Time",
    seatsAvailable: 14
  },
  {
    id: 102,
    departure: "Tunis",
    arrival: "Sfax",
    date: "2026-11-18",
    time: "11:00 AM",
    price: "32.50 TND",
    busId: "BUS-09 (Volvo MultiAxle)",
    status: "On Time",
    seatsAvailable: 8
  },
  {
    id: 103,
    departure: "Sousse",
    arrival: "Tunis",
    date: "2026-11-19",
    time: "03:00 PM",
    price: "25.00 TND",
    busId: "BUS-02 (Irizar i6)",
    status: "On Time",
    seatsAvailable: 20
  }
];

// Initial mock tickets saved in browser memory
export const INITIAL_TICKETS = [
  {
    ref: "TR-8942",
    route: "Tunis ➔ Sousse",
    date: "Nov 18, 2026 • 08:30 AM",
    seat: "Seat 14 (Window)",
    passenger: "Rami Bejaoui",
    status: "Confirmed"
  }
];