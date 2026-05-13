import { useState, useEffect, useCallback } from "react";
import { C, Styles } from "./lib/theme";
import { getCurrentUser, onAuthStateChange } from "./lib/auth";
import { useFetch } from "./lib/useFetch";
import Topbar from "./components/Topbar";
import LoginScreen from "./login/LoginScreen";

import OverviewTab from "./tabs/OverviewTab";
import SubscribersTab from "./tabs/SubscribersTab";
import BarsTab from "./tabs/BarsTab";
import SignageTab from "./tabs/SignageTab";
import FinanceTab from "./tabs/FinanceTab";
import QuestionsTab from "./tabs/QuestionsTab";
import AwsTab from "./tabs/AwsTab";

function Dashboard() {
  const [tab, setTab] = useState("Overview");
  const [drillBar, setDrillBar] = useState(null);
  const [range, setRange] = useState("mtd");
  const [compare, setCompare] = useState("none");
  const [customRange, setCustomRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1),
    end:   new Date(),
  });

  // Pull a freshness summary so the topbar can render "Synced N ago".
  // The same data is included on every endpoint response, but having it
  // top-level lets us refresh it independent of the tab content.
  const { data: _, sources, generatedAt, retry: refreshSources } = useFetch("/analytics/overview", []);
  // Note: we deliberately ignore Overview's data here — OverviewTab fetches
  // its own. The empty deps array means this hook just gives us a sources
  // ping that we re-poll on Refresh.

  const [refreshNonce, setRefreshNonce] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshNonce(n => n + 1);
    refreshSources();
  }, [refreshSources]);

  const renderTab = () => {
    const props = { range, compare, customRange, setTab };
    switch(tab) {
      case "Overview":    return <OverviewTab key={`ov-${refreshNonce}`} setBarDrill={setDrillBar} {...props}/>;
      case "Subscribers": return <SubscribersTab key={`subs-${refreshNonce}`} {...props}/>;
      case "Bars":        return <BarsTab key={`bars-${refreshNonce}`} drillBar={drillBar} setDrillBar={setDrillBar}/>;
      case "Signage":     return <SignageTab key={`sig-${refreshNonce}`} {...props}/>;
      case "Finance":     return <FinanceTab key={`fin-${refreshNonce}`} {...props}/>;
      case "Questions":   return <QuestionsTab key={`q-${refreshNonce}`}/>;
      case "AWS":         return <AwsTab key={`aws-${refreshNonce}`}/>;
      default:            return null;
    }
  };

  return (
    <div style={{
      minHeight:"100vh",
      background: C.grad.main,
      backgroundAttachment:"fixed",
      color:"#fff",
      fontFamily:"'Outfit',sans-serif",
    }}>
      <Styles/>
      <Topbar
        tab={tab}
        setTab={t => { setTab(t); setDrillBar(null); }}
        range={range} setRange={setRange}
        compare={compare} setCompare={setCompare}
        customRange={customRange} setCustomRange={setCustomRange}
        sources={sources}
        generatedAt={generatedAt}
        onRefresh={onRefresh}
      />
      {renderTab()}
      <div style={{padding:"40px 32px 24px",textAlign:"center",fontSize:11,color:C.w(0.25),fontFamily:"'DM Mono',monospace"}}>
        TapTrivia Operator Console · Visudo Labs
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser]     = useState(null);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (!cancelled) {
        setUser(u);
        setReady(true);
      }
    })();
    const stop = onAuthStateChange(({ event }) => {
      if (event === "signedIn") getCurrentUser().then(setUser);
      if (event === "signedOut") setUser(null);
    });

    const reauth = () => setUser(null);
    window.addEventListener("taptrivia:reauth-required", reauth);

    return () => {
      cancelled = true;
      stop && stop();
      window.removeEventListener("taptrivia:reauth-required", reauth);
    };
  }, []);

  if (!ready) {
    return (
      <div style={{
        minHeight:"100vh",
        background: C.grad.main,
        backgroundAttachment:"fixed",
      }}>
        <Styles/>
      </div>
    );
  }

  if (!user) return <LoginScreen onSignedIn={() => getCurrentUser().then(setUser)}/>;

  return <Dashboard/>;
}
