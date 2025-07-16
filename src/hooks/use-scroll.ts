import { useEffect, useState } from "react";

export const useScroll = function (threshold = 10) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(
    function () {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > threshold);
      };

      window.addEventListener("scroll", handleScroll);
      handleScroll();

      return () => window.removeEventListener("scroll", handleScroll);
    },
    [threshold]
  );

  return isScrolled;
};
