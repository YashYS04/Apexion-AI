export const getBackendUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }
  
  // If the browser hostname belongs to the cloud deployment
  if (
    window.location.hostname.includes("run.app") || 
    window.location.hostname.includes("apexion")
  ) {
    return "https://apexion-backend-78199468351.us-central1.run.app";
  }
  
  // Fallback to local development server
  return "http://localhost:8000";
};
