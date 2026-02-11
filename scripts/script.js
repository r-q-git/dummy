const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
let lines = [],
  activeId = null,
  dragging = null,
  hoveredLineId = null;

// Populate Width Dropdown
const widthDrop = document.getElementById("width-dropdown");
for (let i = 1; i <= 50; i = i + 2) {
  const opt = document.createElement("div");
  opt.className = "width-option";
  opt.innerText = i + "px";
  opt.onclick = (e) => {
    e.stopPropagation();
    updateActiveLine(null, i);
    toggleMenu("width-dropdown");
  };
  widthDrop.appendChild(opt);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render();
}
window.onresize = resize;
resize();

function toggleMenu(id) {
  const el = document.getElementById(id);
  const current = el.style.display;
  document.getElementById("width-dropdown").style.display = "none";
  document.getElementById("color-palette").style.display = "none";
  el.style.display =
    current === "flex" || current === "block"
      ? "none"
      : id === "color-palette"
        ? "flex"
        : "block";
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lines.forEach((line) => {
    const pts = [line.start, ...line.elbows, line.end];
    const path = new Path2D(getPath(pts));

    if (line.id === activeId || line.id === hoveredLineId) {
      ctx.strokeStyle = "#c031ff";
      ctx.lineWidth = line.width + 4;
      ctx.stroke(path);
    }

    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.stroke(path);

    if (line.id === activeId) {
      const box = getBoundingBox(line);
      drawIcon(box.midX - 40, box.minY - 45, "move");
      drawIcon(box.midX, box.minY - 45, line.locked ? "locked" : "unlock");
      drawIcon(box.midX + 40, box.minY - 45, "rotate");

      // Render Handles and Delete Buttons
      [line.start, line.end].forEach((p) => {
        drawHandle(p.x, p.y);
      });

      line.elbows.forEach((p) => {
        drawHandle(p.x, p.y);
        // Delete Button: Red circle with white X
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(p.x + 15, p.y - 15, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✕", p.x + 15, p.y - 15);
      });
    }
  });
}

function drawHandle(x, y) {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawIcon(x, y, type) {
  const size = 30; // Increased slightly for better padding
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#fff";

  // Fill background so the line doesn't show through the icon
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.strokeRect(x - size / 2, y - size / 2, size, size);

  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle"; // This centers the glyph vertically
  ctx.font = "18px Arial";

  let icon =
    type === "move"
      ? "✥"
      : type === "rotate"
        ? "↻"
        : type === "locked"
          ? "🔒"
          : "🔓";

  // Drawing at (x, y) with 'middle' baseline puts the center of the text at y
  // We add a tiny 1px tweak if specific glyphs look too high or low
  const yOffset = type === "move" ? 0 : 1;
  ctx.fillText(icon, x, y + yOffset);
  ctx.restore();
}

function getPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function getBoundingBox(line) {
  const all = [line.start, line.end, ...line.elbows];
  const minX = Math.min(...all.map((p) => p.x)),
    maxX = Math.max(...all.map((p) => p.x));
  return {
    minY: Math.min(...all.map((p) => p.y)),
    midX: (minX + maxX) / 2,
  };
}

function getLineAt(x, y) {
  // We iterate backwards to select the line "on top" first
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    const path = new Path2D(getPath([l.start, ...l.elbows, l.end]));

    // Create a wider invisible hit area (20px) for easier selection
    ctx.lineWidth = 20;
    if (ctx.isPointInStroke(path, x, y)) return l;
  }
  return null;
}

canvas.onmousedown = (e) => {
  const x = e.clientX,
    y = e.clientY;
  const activeLine = lines.find((l) => l.id === activeId);

  // 1. Check UI elements of the already active line first
  if (activeLine) {
    const box = getBoundingBox(activeLine);

    // Check Lock/Move/Rotate Icons
    if (Math.hypot(x - box.midX, y - (box.minY - 45)) < 15) {
      toggleLock();
      return;
    }

    if (!activeLine.locked) {
      // Check Delete Buttons for Elbows
      for (let i = 0; i < activeLine.elbows.length; i++) {
        const p = activeLine.elbows[i];
        if (Math.hypot(x - (p.x + 15), y - (p.y - 15)) < 10) {
          activeLine.elbows.splice(i, 1);
          render();
          return;
        }
      }
      // Check Draggable Points (Start, End, Elbows)
      const p = [activeLine.start, activeLine.end, ...activeLine.elbows].find(
        (pt) => Math.hypot(x - pt.x, y - pt.y) < 15,
      );
      if (p) {
        dragging = { type: "point", ref: p };
        return;
      }

      // Check Move/Rotate Icons
      if (Math.hypot(x - (box.midX - 40), y - (box.minY - 45)) < 15) {
        dragging = { type: "line", line: activeLine, lx: x, ly: y };
        return;
      }
      if (Math.hypot(x - (box.midX + 40), y - (box.minY - 45)) < 15) {
        const c = {
          x: (activeLine.start.x + activeLine.end.x) / 2,
          y: (activeLine.start.y + activeLine.end.y) / 2,
        };
        dragging = {
          type: "rotate",
          line: activeLine,
          center: c,
          sa: Math.atan2(y - c.y, x - c.x),
        };
        return;
      }
    }
  }

  // 2. If no UI was clicked, try to select a new line
  const clickedLine = getLineAt(x, y);
  if (clickedLine) {
    setActive(clickedLine.id);
  } else {
    setActive(null);
  }
};

window.onmousemove = (e) => {
  const x = e.clientX,
    y = e.clientY;

  // Boundary limits (padding of 5px so handles don't get stuck on the very edge)
  const minX = 5,
    minY = 5;
  const maxX = canvas.width - 5,
    maxY = canvas.height - 5;

  let cursor = "default";

  if (dragging) {
    cursor = "grabbing";

    if (dragging.type === "point") {
      // Prevent point from leaving canvas
      dragging.ref.x = Math.max(minX, Math.min(maxX, x));
      dragging.ref.y = Math.max(minY, Math.min(maxY, y));
    } else if (dragging.type === "line") {
      let dx = x - dragging.lx;
      let dy = y - dragging.ly;

      const pts = [
        dragging.line.start,
        dragging.line.end,
        ...dragging.line.elbows,
      ];

      // Check if ANY point in the line would go out of bounds
      const canMoveX = pts.every((p) => p.x + dx >= minX && p.x + dx <= maxX);
      const canMoveY = pts.every((p) => p.y + dy >= minY && p.y + dy <= maxY);

      pts.forEach((p) => {
        if (canMoveX) p.x += dx;
        if (canMoveY) p.y += dy;
      });

      dragging.lx = x;
      dragging.ly = y;
    } else if (dragging.type === "rotate") {
      const na = Math.atan2(y - dragging.center.y, x - dragging.center.x);
      const diff = na - dragging.sa;

      [dragging.line.start, dragging.line.end, ...dragging.line.elbows].forEach(
        (p) => {
          const dx = p.x - dragging.center.x;
          const dy = p.y - dragging.center.y;

          // Calculate new potential positions
          const nx =
            dragging.center.x + dx * Math.cos(diff) - dy * Math.sin(diff);
          const ny =
            dragging.center.y + dx * Math.sin(diff) + dy * Math.cos(diff);

          // Only update if within bounds
          p.x = Math.max(minX, Math.min(maxX, nx));
          p.y = Math.max(minY, Math.min(maxY, ny));
        },
      );
      dragging.sa = na;
    }
  } else {
    // ... rest of your cursor/hover logic (getLineAt, etc.) ...
    const l = lines.find((l) => l.id === activeId);
    if (l && !l.locked) {
      if (
        [l.start, l.end, ...l.elbows].some(
          (p) => Math.hypot(x - p.x, y - p.y) < 10,
        )
      )
        cursor = "grab";
      if (l.elbows.some((p) => Math.hypot(x - (p.x + 15), y - (p.y - 15)) < 10))
        cursor = "pointer";
    }
    if (cursor === "default" && hoveredLineId) cursor = "pointer";
  }

  canvas.style.cursor = cursor;
  render();
};

window.onmouseup = () => (dragging = null);

function setActive(id) {
  activeId = id ? Number(id) : null;
  const nav = document.getElementById("navbar");
  if (activeId) {
    const l = lines.find((l) => l.id === activeId);
    document.getElementById("active-color-swatch").style.background = l.color;
    document.getElementById("navLockBtn").innerHTML = l.locked
      ? '<i class="fa-solid fa-lock fa-lg" style="color:#3b82f6"></i>'
      : '<i class="fa-solid fa-unlock fa-lg"></i>';
    nav.style.display = "flex";
  } else {
    nav.style.display = "none";
  }
  render();
}

function updateActiveLine(c, w) {
  const l = lines.find((l) => l.id === activeId);
  if (!l) return;
  if (c) {
    l.color = c;
    document.getElementById("active-color-swatch").style.background = c;
  }
  if (w) l.width = w;
  render();
}

function toggleLock() {
  const l = lines.find((l) => l.id === activeId);
  if (l) {
    l.locked = !l.locked;
    setActive(l.id);
  }
}

function deleteActiveLine() {
  lines = lines.filter((l) => l.id !== activeId);
  setActive(null);
}

function addNewLine(type) {
  const id = Date.now();
  let newLine = {
    id,
    color: "#3B82F6",
    width: 6,
    start: { x: 200, y: 300 },
    end: { x: 500, y: 300 },
    elbows: [],
    locked: false,
  };
  if (type === "step") {
    newLine.elbows = [
      { x: 350, y: 300 },
      { x: 350, y: 450 },
    ];
    newLine.end = { x: 500, y: 450 };
  } else if (type === "curved") {
    newLine.elbows = [{ x: 350, y: 200 }];
  }
  lines.push(newLine);
  setActive(id);
}

canvas.ondblclick = (e) => {
  // Use offsetX/Y for accurate canvas coordinates
  const x = e.offsetX;
  const y = e.offsetY;

  const l = lines.find((l) => l.id === activeId);
  if (!l || l.locked) return;

  // 1. Create a "hit area" path for the current line
  const pts = [l.start, ...l.elbows, l.end];
  const path = new Path2D(getPath(pts));

  // 2. Check if the double-click was actually ON the line
  // We use a wider lineWidth (20) just for the "hit test" to make it easier to click
  ctx.lineWidth = 20;
  if (ctx.isPointInStroke(path, x, y)) {
    // Find the best segment to insert the new point into
    const seq = [l.start, ...l.elbows, l.end];
    let bestIdx = -1;
    let minDist = 30;

    for (let i = 0; i < seq.length - 1; i++) {
      const d = pToSegDist(x, y, seq[i], seq[i + 1]);
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1) {
      // Insert the point into the elbows array at the correct index
      l.elbows.splice(bestIdx, 0, { x, y });
      render();
    }
  }
};

function pToSegDist(x, y, a, b) {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return Math.hypot(x - a.x, y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / l2),
  );
  return Math.hypot(x - (a.x + t * (b.x - a.x)), y - (a.y + t * (b.y - a.y)));
}

function generateSvgBase64() {
  // 1. Generate the path strings from your data
  const paths = lines
    .map(
      (l) =>
        `<path d="${getPath([l.start, ...l.elbows, l.end])}" fill="none" stroke="${l.color}" stroke-width="${l.width}" />`,
    )
    .join("");

  // 2. Construct the full XML string with the required namespace
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;

  // 3. Encode to Base64
  // We use encodeURIComponent + unescape to ensure we don't break on non-ASCII characters
  const base64 = window.btoa(unescape(encodeURIComponent(svgString)));

  console.log(`data:image/svg+xml;base64,${base64}`);

  // 4. Return the Data URI
  return `data:image/svg+xml;base64,${base64}`;
}


