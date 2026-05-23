"use client";

import dynamic from "next/dynamic";

const LazyQueryForm = dynamic(() => import("./QueryForm"), { ssr: false });

export default LazyQueryForm;
