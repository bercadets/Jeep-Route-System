// --- Jeepney Routes ---
const jeepneyRoutes = [
  {
    name: "Alangilan - Batangas City",
    color: "blue",
    waypoints: [
      [13.79044, 121.06232],
      [13.79214, 121.07015],
      [13.78661, 121.06915],
      [13.77040, 121.06519],
      [13.76413, 121.05889],
      [13.76002, 121.05755],
      [13.75819, 121.05699],
      [13.75065, 121.05684],
      [13.75251, 121.05203],
      [13.75548, 121.05309],
      [13.75741, 121.05544],
      [13.75832, 121.06306],
      [13.77050, 121.06555],
      [13.79044, 121.06232]
    ]
  },
  {
    name: "Balagtas - Batangas City",
    color: "yellow",
    waypoints: [
      [13.79044, 121.06232],
      [13.79214, 121.07015],
      [13.78661, 121.06915],
      [13.77040, 121.06519],
      [13.76413, 121.05889]
    ]
  },
  {
    name: "Lipa - Batangas City",
    color: "red",
    waypoints: [
      [13.79822, 121.07121],
      [13.76266, 121.05738],
      [13.77105, 121.05096],
      [13.79079, 121.06122]
    ]
  }
];

// --- Initialize map ---
const map = L.map("map").setView([13.75560, 121.07066], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// --- User location ---
let userLocation = null;
map.locate({ setView: true, maxZoom: 16 });
map.on("locationfound", (e) => {
  userLocation = e.latlng;
  L.marker(userLocation).addTo(map).bindPopup("📍 You are here").openPopup();
});
map.on("locationerror", () => {
  userLocation = L.latLng(13.75560, 121.07066);
});

// --- Routing controls ---
let routingControls = [];
function clearRoutes() {
  routingControls.forEach(c => map.removeControl(c));
  routingControls = [];
}

function drawRoutes(routesToDraw) {
  clearRoutes();
  routesToDraw.forEach(route => {
    const control = L.Routing.control({
      waypoints: route.waypoints.map(p => L.latLng(p[0], p[1])),
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      lineOptions: { styles: [{ color: route.color, weight: 3 }] },
    }).addTo(map);
    routingControls.push(control);
  });
}

// --- Helper: distance calculator (still used for nearest route) ---
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Search logic using Nominatim ---
const searchBtn = document.getElementById("searchBtn");
const locationInput = document.getElementById("locationInput");

searchBtn.addEventListener("click", async () => {
  const query = locationInput.value.trim();
  if (!query) return;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (!data.length) {
      alert("Location not found!");
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    // Mark searched place
    L.marker([lat, lng]).addTo(map).bindPopup("🔍 " + query).openPopup();
    map.setView([lat, lng], 15);

    // --- Find jeep routes that pass near searched location (using Turf.js) ---
    let matchingRoutes = jeepneyRoutes.filter(route => {
      const line = turf.lineString(route.waypoints.map(([lat, lng]) => [lng, lat]));
      const point = turf.point([lng, lat]);
      const distance = turf.pointToLineDistance(point, line, { units: "meters" });
      return distance <= 200; // passes within 200m
    });

    // --- If none pass by, find the nearest route to user's location ---
    if (matchingRoutes.length === 0 && userLocation) {
      let nearestRoute = null;
      let nearestDist = Infinity;

      jeepneyRoutes.forEach(route => {
        route.waypoints.forEach(([wpLat, wpLng]) => {
          const d = getDistanceFromLatLonInMeters(
            userLocation.lat,
            userLocation.lng,
            wpLat,
            wpLng
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearestRoute = route;
          }
        });
      });

      if (nearestRoute) matchingRoutes = [nearestRoute];
    }

    // Draw routes found
    drawRoutes(matchingRoutes);
  } catch (err) {
    console.error(err);
    alert("Error fetching location.");
  }
});
