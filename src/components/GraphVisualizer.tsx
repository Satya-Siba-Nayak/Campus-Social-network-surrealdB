import React from 'react';
import {
  Student,
  GraphRelationship,
  WroteEdgeRecord,
  PostNodeRecord,
} from '../lib/db';
import { getInitials } from './StudentCard';

interface GraphVisualizerProps {
  students: Student[];
  followEdges: GraphRelationship[];
  wroteEdges: WroteEdgeRecord[];
  postNodes: PostNodeRecord[];
  currentUserId: string;
  followingIds: Set<string>;
  followerIds: Set<string>;
  fofIds: Set<string>;
  onSelectStudent: (studentId: string) => void;
  showPostsInGraph?: boolean;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  students,
  followEdges,
  wroteEdges,
  postNodes,
  currentUserId,
  followingIds,
  followerIds,
  fofIds,
  onSelectStudent,
  showPostsInGraph = false,
}) => {
  const width = 760;
  const height = 430;
  const cx = width / 2;
  const cy = height / 2;
  const studentRadius = showPostsInGraph ? 125 : 148;
  const postRadius = 185;

  // Compute circular coordinates for each student node
  const studentPositions = new Map<string, { x: number; y: number; student: Student }>();
  const count = students.length || 1;

  students.forEach((st, idx) => {
    // Place currentUserId at top (-90 deg) for clarity
    const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
    const x = cx + studentRadius * Math.cos(angle);
    const y = cy + studentRadius * Math.sin(angle);
    studentPositions.set(st.id, { x, y, student: st });
  });

  // Optional outer ring for post nodes
  const postPositions = new Map<string, { x: number; y: number; post: PostNodeRecord }>();
  if (showPostsInGraph && postNodes.length > 0) {
    postNodes.forEach((p, idx) => {
      const angle = (2 * Math.PI * idx) / postNodes.length - Math.PI / 3;
      const x = cx + postRadius * Math.cos(angle);
      const y = cy + postRadius * Math.sin(angle);
      postPositions.set(p.id, { x, y, post: p });
    });
  }

  return (
    <div className="rounded-[24px] bg-[#121215] border border-white/[0.07] overflow-hidden">
      {/* Header + Legend */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-white">
              Interactive Social Graph Topology
            </h3>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
              {students.length} nodes · {followEdges.length} follows edges
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Click any student node to inspect their profile &amp; 1-hop / 2-hop graph paths
          </p>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-white border border-black" />
            Active You
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            1-Hop Following
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            2-Hop Friend of Friend
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-sky-400" />
            1-Hop Follower
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative bg-[#09090b] flex items-center justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[760px] h-auto select-none"
        >
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="28"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#52525b" />
            </marker>
            <marker
              id="arrow-outgoing"
              viewBox="0 0 10 10"
              refX="28"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
            </marker>
            <marker
              id="arrow-fof"
              viewBox="0 0 10 10"
              refX="28"
              refY="5"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
            </marker>
          </defs>

          {/* Subtle Concentric Guide Rings */}
          <circle
            cx={cx}
            cy={cy}
            r={studentRadius}
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeDasharray="4 4"
          />

          {/* 1. Render `wrote` edges if enabled */}
          {showPostsInGraph &&
            wroteEdges.map((edge) => {
              const from = studentPositions.get(edge.in);
              const to = postPositions.get(edge.out);
              if (!from || !to) return null;
              return (
                <g key={edge.id}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#38bdf8"
                    strokeOpacity={0.35}
                    strokeWidth={1.2}
                    strokeDasharray="3 3"
                  />
                </g>
              );
            })}

          {/* 2. Render `follows` directed edges */}
          {followEdges.map((edge) => {
            const from = studentPositions.get(edge.in);
            const to = studentPositions.get(edge.out);
            if (!from || !to) return null;

            const isOutgoingFromCurrent = edge.in === currentUserId;
            const isSecondHop =
              followingIds.has(edge.in) && fofIds.has(edge.out);

            // Slight curve offset so bidirectional edges (A->B and B->A) don't overlap
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const normX = -dy / len;
            const normY = dx / len;
            const curveOffset = 14;
            const midX = (from.x + to.x) / 2 + normX * curveOffset;
            const midY = (from.y + to.y) / 2 + normY * curveOffset;

            let strokeColor = '#3f3f46';
            let strokeWidth = 1.5;
            let strokeOpacity = 0.65;
            let marker = 'url(#arrow-default)';

            if (isOutgoingFromCurrent) {
              strokeColor = '#34d399'; // emerald 1-hop
              strokeWidth = 2.4;
              strokeOpacity = 0.95;
              marker = 'url(#arrow-outgoing)';
            } else if (isSecondHop) {
              strokeColor = '#fbbf24'; // amber 2-hop
              strokeWidth = 2;
              strokeOpacity = 0.85;
              marker = 'url(#arrow-fof)';
            }

            return (
              <path
                key={edge.id}
                d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
                markerEnd={marker}
              />
            );
          })}

          {/* 3. Render Post nodes if enabled */}
          {showPostsInGraph &&
            Array.from(postPositions.values()).map(({ x, y, post }) => (
              <g key={post.id} transform={`translate(${x}, ${y})`}>
                <rect
                  x={-24}
                  y={-12}
                  width={48}
                  height={24}
                  rx={6}
                  fill="#0c4a6e"
                  stroke="#38bdf8"
                  strokeWidth={1.2}
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#e0f2fe"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {post.id}
                </text>
              </g>
            ))}

          {/* 4. Render Student Nodes */}
          {Array.from(studentPositions.values()).map(({ x, y, student }) => {
            const isSelf = student.id === currentUserId;
            const is1HopFollowing = followingIds.has(student.id);
            const is2HopFoF = fofIds.has(student.id);
            const is1HopFollower = followerIds.has(student.id);

            let ringColor = '#52525b';
            let fillBg = '#18181b';
            let textColor = '#f4f4f5';
            let badgeText = '';

            if (isSelf) {
              ringColor = '#ffffff';
              fillBg = '#ffffff';
              textColor = '#000000';
              badgeText = 'YOU';
            } else if (is1HopFollowing) {
              ringColor = '#34d399';
              fillBg = '#064e3b';
              textColor = '#ecfdf5';
              badgeText = '1-HOP';
            } else if (is2HopFoF) {
              ringColor = '#fbbf24';
              fillBg = '#451a03';
              textColor = '#fef3c7';
              badgeText = '2-HOP FoF';
            } else if (is1HopFollower) {
              ringColor = '#38bdf8';
              fillBg = '#0c4a6e';
              textColor = '#e0f2fe';
              badgeText = 'FOLLOWER';
            }

            return (
              <g
                key={student.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectStudent(student.id)}
                className="cursor-pointer group"
              >
                {/* Outer Ring */}
                <circle
                  r={24}
                  fill={fillBg}
                  stroke={ringColor}
                  strokeWidth={isSelf ? 3 : 2.2}
                />

                {/* Initials */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fill={textColor}
                  fontSize="12"
                  fontWeight="700"
                >
                  {getInitials(student.name)}
                </text>

                {/* Student Name + Record ID Label Below Node */}
                <rect
                  x={-54}
                  y={29}
                  width={108}
                  height={28}
                  rx={6}
                  fill="rgba(9, 9, 11, 0.88)"
                  stroke="rgba(255,255,255,0.08)"
                />
                <text
                  textAnchor="middle"
                  y={41}
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="600"
                >
                  {student.name}
                </text>
                <text
                  textAnchor="middle"
                  y={52}
                  fill="#a1a1aa"
                  fontSize="8.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {student.id}
                </text>

                {/* Hop Badge Above Node */}
                {badgeText && (
                  <g transform="translate(0, -32)">
                    <rect
                      x={-28}
                      y={-9}
                      width={56}
                      height={15}
                      rx={7}
                      fill={ringColor}
                    />
                    <text
                      textAnchor="middle"
                      y={1.5}
                      fill="#000000"
                      fontSize="8"
                      fontWeight="800"
                    >
                      {badgeText}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
