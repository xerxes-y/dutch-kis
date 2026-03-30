"use client";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { WeaknessScores } from "@/lib/weakness-map";

interface Props {
  scores: WeaknessScores;
}

const AXES = [
  { key: "grammar.deHet", label: "De/Het" },
  { key: "grammar.separableVerbs", label: "Sep. Verbs" },
  { key: "grammar.v2WordOrder", label: "Word Order" },
  { key: "pronunciation.gSchSounds", label: "G Sound" },
  { key: "pronunciation.uiIjDiphthongs", label: "UI/IJ" },
  { key: "vocabulary.daily", label: "Vocabulary" },
  { key: "listening", label: "Listening" },
  { key: "writing.formalRegister", label: "Writing" },
  { key: "register.idioms", label: "Idioms" },
  { key: "grammar.verbConjugation", label: "Verbs" },
];

function getScore(scores: WeaknessScores, path: string): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = scores;
  for (const p of parts) cur = cur?.[p];
  return typeof cur === "number" ? cur : 50;
}

export default function WeaknessMapChart({ scores }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 400;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 160;
    const n = AXES.length;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg.selectAll("*").remove();

    const angleSlice = (Math.PI * 2) / n;

    // Grid circles
    [0.25, 0.5, 0.75, 1].forEach((level) => {
      svg
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", radius * level)
        .attr("fill", "none")
        .attr("stroke", "var(--card-border)")
        .attr("stroke-width", 1);
    });

    // Spokes
    AXES.forEach((_, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      svg
        .append("line")
        .attr("x1", cx)
        .attr("y1", cy)
        .attr("x2", cx + radius * Math.cos(angle))
        .attr("y2", cy + radius * Math.sin(angle))
        .attr("stroke", "var(--card-border)")
        .attr("stroke-width", 1);
    });

    // Data polygon
    const points = AXES.map((axis, i) => {
      const score = getScore(scores, axis.key) / 100;
      const angle = angleSlice * i - Math.PI / 2;
      return {
        x: cx + radius * score * Math.cos(angle),
        y: cy + radius * score * Math.sin(angle),
        score: getScore(scores, axis.key),
        label: axis.label,
      };
    });

    const lineGen = d3
      .lineRadial<{ score: number }>()
      .radius((d) => (d.score / 100) * radius)
      .angle((_, i) => angleSlice * i);

    svg
      .append("path")
      .datum(AXES.map((a) => ({ score: getScore(scores, a.key) })))
      .attr("d", lineGen)
      .attr(
        "transform",
        `translate(${cx},${cy}) rotate(-90)`
      )
      .attr("fill", "var(--accent)")
      .attr("fill-opacity", 0.15)
      .attr("stroke", "var(--accent)")
      .attr("stroke-width", 2);

    // Dots
    points.forEach((p) => {
      svg
        .append("circle")
        .attr("cx", p.x)
        .attr("cy", p.y)
        .attr("r", 4)
        .attr("fill", "var(--accent)");
    });

    // Labels
    AXES.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const labelR = radius + 22;
      svg
        .append("text")
        .attr("x", cx + labelR * Math.cos(angle))
        .attr("y", cy + labelR * Math.sin(angle))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "10")
        .attr("fill", "var(--muted)")
        .text(axis.label);
    });
  }, [scores]);

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
    >
      <h2 className="font-display font-semibold text-lg mb-4">
        Your Dutch DNA
      </h2>
      <div className="flex justify-center">
        <svg ref={svgRef} className="w-full max-w-sm" />
      </div>
    </div>
  );
}
