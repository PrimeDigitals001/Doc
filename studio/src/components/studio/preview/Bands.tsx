"use client";

import type { Doc } from "@/lib/schema";
import { DOC_TYPE_EYEBROW, IS_LETTER } from "@/lib/schema";
import { Positionable } from "../Positionable";

/* eslint-disable @next/next/no-img-element -- decorative brand SVG/PNG from /public,
   deliberately unoptimised so it prints identically. */

export function TopBand({ doc }: { doc: Doc }) {
  return (
    <Positionable
      id="topband"
      className="fg-topband"
      baseStyle={{ height: doc.bands.topHeight }}
    >
      <img src="/brand/header-ribbon.svg" alt="" aria-hidden className="fg-topband__bg" />
      <Positionable
        id="logo"
        as="span"
        anchor="leftCentered"
        className="fg-topband__logo-wrap"
      >
        <img
          src="/brand/logo.png"
          alt="Prime Digitals"
          className="fg-topband__logo"
          style={{ height: doc.bands.topLogoSize }}
          draggable={false}
        />
      </Positionable>
      {!IS_LETTER[doc.type] && (
        <Positionable
          id="title"
          anchor="rightCentered"
          className="fg-topband__title"
          baseStyle={{ fontSize: doc.bands.topTitleSize }}
        >
          {DOC_TYPE_EYEBROW[doc.type]}
        </Positionable>
      )}
    </Positionable>
  );
}

export function BottomBand({ doc }: { doc: Doc }) {
  return (
    <Positionable
      id="bottomband"
      className="fg-bottomband"
      baseStyle={{ height: doc.bands.bottomHeight }}
    >
      <img src="/brand/footer-ribbon.svg" alt="" aria-hidden className="fg-bottomband__bg" />
    </Positionable>
  );
}
