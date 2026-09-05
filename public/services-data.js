// Service catalog: each service defines its own extra form fields.
// Add/remove services here — the storefront and admin panel both read from this file.
const SERVICE_CATEGORIES = [
  {
    category: "Computer Services",
    categoryIcon: "🖥️",
    tagline: "Repair, build, and set up systems that keep working",
    services: [
      {
        id: "computer-repair",
        title: "Computer Repair",
        icon: "🛠️",
        blurb: "Hardware faults, slow performance, software issues.",
        fields: [
          { name: "deviceType", label: "Device type", type: "select", options: ["Desktop", "Laptop", "All-in-One PC"] },
          { name: "brand", label: "Brand / model (if known)", type: "text" },
          { name: "issue", label: "Describe the problem", type: "textarea" }
        ]
      },
      {
        id: "new-assembly",
        title: "New Computer Assembly",
        icon: "🖥️",
        blurb: "Custom-built desktop matched to your budget and use.",
        fields: [
          { name: "purpose", label: "Main use", type: "select", options: ["Gaming", "Office work", "Graphic design", "Programming", "General use"] },
          { name: "budget", label: "Budget range", type: "select", options: ["Under ₹25,000", "₹25,000 - ₹50,000", "₹50,000 - ₹1,00,000", "Above ₹1,00,000"] }
        ]
      },
      {
        id: "laptop-repair",
        title: "Laptop Repair",
        icon: "💻",
        blurb: "Screen, keyboard, battery, motherboard and more.",
        fields: [
          { name: "brand", label: "Laptop brand", type: "text" },
          { name: "issue", label: "Describe the problem", type: "textarea" }
        ]
      },
      {
        id: "software-install",
        title: "Software Installation",
        icon: "💾",
        blurb: "OS, Office, antivirus, drivers and business software.",
        fields: [
          { name: "os", label: "Current operating system", type: "select", options: ["Windows 10", "Windows 11", "macOS", "Linux", "Not sure"] },
          { name: "software", label: "Software needed", type: "text" }
        ]
      },
      {
        id: "networking",
        title: "Networking Setup",
        icon: "🌐",
        blurb: "Wired LAN and WiFi for home, shop or office.",
        fields: [
          { name: "premisesType", label: "Premises type", type: "select", options: ["Home", "Office", "Shop", "Other"] },
          { name: "points", label: "Number of systems / points", type: "number" }
        ]
      }
    ]
  },
  {
    category: "CCTV Services",
    categoryIcon: "📹",
    tagline: "Installation and upkeep for cameras that never blink",
    services: [
      {
        id: "cctv-installation",
        title: "CCTV Installation",
        icon: "📷",
        blurb: "New camera setup for home, shop or office.",
        fields: [
          { name: "propertyType", label: "Property type", type: "select", options: ["Home", "Shop", "Office", "Warehouse", "Other"] },
          { name: "cameraCount", label: "Cameras required", type: "number" },
          { name: "existingSetup", label: "Existing CCTV already installed?", type: "select", options: ["Yes", "No"] }
        ]
      },
      {
        id: "cctv-repair",
        title: "CCTV Repair & Maintenance",
        icon: "🔧",
        blurb: "Fix camera, DVR/NVR or cabling faults.",
        fields: [
          { name: "cameraCount", label: "Cameras currently installed", type: "number" },
          { name: "issue", label: "Describe the problem", type: "textarea" }
        ]
      },
      {
        id: "cctv-amc",
        title: "CCTV AMC (Annual Maintenance)",
        icon: "📅",
        blurb: "Yearly maintenance contract for your existing setup.",
        fields: [
          { name: "cameraCount", label: "Number of cameras", type: "number" },
          { name: "lastService", label: "Last service date", type: "date" }
        ]
      },
      {
        id: "dvr-nvr-setup",
        title: "DVR / NVR Setup",
        icon: "🗄️",
        blurb: "Recorder installation, configuration and mobile access.",
        fields: [
          { name: "recorderType", label: "Recorder type", type: "select", options: ["DVR", "NVR", "Not sure"] },
          { name: "remoteAccess", label: "Need mobile remote viewing?", type: "select", options: ["Yes", "No"] }
        ]
      }
    ]
  }
];

// flat lookup by id, handy for the admin panel
const SERVICE_LOOKUP = {};
SERVICE_CATEGORIES.forEach((cat) => {
  cat.services.forEach((svc) => {
    SERVICE_LOOKUP[svc.id] = { ...svc, category: cat.category };
  });
});
