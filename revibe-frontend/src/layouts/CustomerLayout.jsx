import React from "react";
import { Outlet } from "react-router-dom";
import BottomTab from "../components/BottomTab.jsx";

export default function CustomerLayout() {
  return (
    <div style={st.shell}>
      <div style={st.wrap}>
        <Outlet />
        {/* spacer chống bị tab che nội dung */}
        <div style={{ height: 100 }} />
      </div>

      {/* Bottom Tab của bạn */}
      <BottomTab />
    </div>
  );
}

const st = {
  shell:  { minHeight:"100vh", background:"#f8fafc", position:"relative", overflowX:"hidden" },
  wrap:   { width:"min(430px,100%)", margin:"0 auto" },
};
