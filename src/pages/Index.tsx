import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    window.location.replace("/weather/weather.html");
  }, []);
  return null;
};

export default Index;
