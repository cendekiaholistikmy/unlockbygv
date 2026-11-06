import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { IslandProvider } from "@/components/DynamicIsland";
import { DataProvider, useRoute } from "@/lib/store";
import Home from "@/pages/Home";
import Sessions from "@/pages/Sessions";
import Speak from "@/pages/Speak";
import Admin from "@/pages/Admin";

function Routes() {
  const route = useRoute();
  const [, section, id] = route.split("/");
  const page = section || "home";

  // New page: back to the top. Opening a session keeps your place in the list.
  const prev = React.useRef(page);
  React.useEffect(() => {
    if (prev.current !== page) window.scrollTo({ top: 0 });
    prev.current = page;
  }, [page]);

  let el: React.ReactNode;
  if (page === "sessions") el = <Sessions openId={id} />;
  else if (page === "speak") el = <Speak />;
  else if (page === "admin") el = <Admin />;
  else el = <Home />;

  return (
    <AnimatePresence mode="wait">
      <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
        {el}
        {page !== "admin" && <Footer />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <DataProvider>
      <IslandProvider>
        <Nav />
        <Routes />
      </IslandProvider>
    </DataProvider>
  );
}
