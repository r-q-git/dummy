const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
let lines = [],
  activeId = null,
  dragging = null,
  hoveredLineId = null;

/**
 * @description
 * this takes the width-dropdown and dynamically add the line value options in it, along with control added to the each div to update the line width and toggle the menu to close.
 */
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

/**
 * @description
 * this method resize the canvas to the window size.
 * also when we change the canvas size, by default the everything on the canvas gets erased. so we need to call the render immediately to get evrything back as we resize.
 * and we set this to the window.onresize event to call this everytime we resize the browser size so as to get the proper lines.
 * also, this need to call once on the start of the app as the by-default size of the canvas is (typically 300x150 pixels). so as to get the full size as per our need.
 *
 */
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render();
}
window.onresize = resize;
resize();

/**
 * @description
 * this function toggle between between the opening and closing of the drop-down menu for both width-dropdown and color-palette.
 *
 * @param
 * this takes the id the html element whose toggle is managed.
 *
 *
 */
function toggleMenu(id) {
  // here id is the id of the element.
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

/**
 * @description
 * - this function is the main heart of the whole project, it render the line on the screen as it gets changed, everytime. Also, the canvas is cleared everytime before we draw the new line from top-left to the bottom-right.
 * - for each line, we are taking the co-ordinates of the start, elbow points or the between and end points of the each line and then pass through it he getPath() method.
 * - this method makes the points object array and convert them to the svg path (https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Paths) ie. M, L, C, etc. form.
 * and then new Path2D() method draw it on the canvas when we pass the svg path.
 *
 * section 1:
 * In this, if the line is active line which we confirm by the id given to the line object or it is hovered, then, we will add the outer line of the purple color to it.
 *
 * section 2:
 * In this, we have setted the line color, line's width and line end shape. then, we will draw this.
 *
 * section 3:
 * - if the line is the activeId (we maintin it global),
 * then we create the imaginary boundarybox of the line using its properties.
 * - then we will draw move, locked or unlocked and roatate icon based on that, this is done by drawIcon() method.
 *
 * - Next we will draw the circles at the end with drawIcon() method.
 * - Now, for the every elbow of the line, we will draw the circle with white bg, red text and X symbol between with a radius of the 8.
 */

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  lines.forEach((line) => {
    const pts = [line.start, ...line.elbows, line.end];
    const path = new Path2D(getPath(pts));

    // section 1:
    if (line.id === activeId || line.id === hoveredLineId) {
      ctx.strokeStyle = "#c031ff";
      ctx.lineWidth = line.width + 2;
      ctx.stroke(path);
    }

    // section 2:
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.lineCap = ctx.lineJoin = "straight";
    ctx.stroke(path);

    // section 3;
    if (line.id === activeId) {
      const box = getBoundingBox(line);
      drawIcon(box.midX - 40, box.minY - 45, "move");
      drawIcon(box.midX + 40, box.minY - 45, "rotate");
      drawIcon(box.midX, box.minY - 45, line.locked ? "locked" : "unlock");

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

/**
 * @description
 * this method draws the handle means end points (circular one). all the points endpoints and elbow points draws as same.
 * the bg is white and outer arc of the circle is black with thickness 1.5.
 * @params
 * this takes two params x and y which shows the position where the handle to be drawn.
 */

function drawHandle(x, y) {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 *
 * @description
 * - this draws the move, rotate and lock icon on the canvas.
 * -  Also, this draws the box around the each icon.
 * - we are restoring the canvas setting to last one after drawing these icons on the canvas as we have the single brush.
 *
 * @param
 * - x and y are position where to draw and type is which shape to draw, move, rotate and lock.
 */
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
  const yOffset = type === "move" ? 0 : 1;
  ctx.fillText(icon, x, y + yOffset);
  ctx.restore();
}

/**
 *
 * @description
 * - this fxn, takes the line points object's array and convert them to the single Path String of the svg which containes the M, L, C commands to move the line.
 * - the returned string is then passed to the new Path2D() method.
 *
 * @param
 * - this takes the point object's array of the single line.
 *
 *
 * @returns
 * - the path svg string with which It draws the pathon the canvas.
 */

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

/**
 *
 * @description
 * - this takes all the points of the line and find the max and min along the x axis and then find the mix point of that.
 * - along y it find the min y value and return these as the object.
 * - these values can be used to put the drawIcon method to get the position of the move, rotate and lock button over the line.
 *
 * @param
 * - it takes the line object which has different set of the valeus such as the start, end and elbow points coordinates as the two value object.
 *
 * @return
 * - it returns the object which has the middle X value of the line drawn to get the center of the line and min Y value to get the position just above the line.
 */

function getBoundingBox(line) {
  const all = [line.start, line.end, ...line.elbows];
  const minX = Math.min(...all.map((p) => p.x)),
    maxX = Math.max(...all.map((p) => p.x));
  return {
    minY: Math.min(...all.map((p) => p.y)),
    midX: (minX + maxX) / 2,
  };
}

/**
 *
 * @description
 * - here we are checking the line is at the point or not, for that we will take the cursor's current x and y and then check the lines from the array's last line to the initial incase of multiple lines one over the other and find which one is selected.
 *  - then with method new Path2D we will generate the svg path string and try to find the coordinate is on the line or not and if yes then return the line object itself.
 * - also, we will increase the line width by 20 px.
 *
 * @param
 * - coordinate position x and y which we will from the mouse coordinates.
 *
 *
 * @returns
 * - if the point is over the line returns the line otherwise null.
 */

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

/**
 *
 * @description
 *
 *
 * @param
 * @returns
 */

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

/**
 * @description
 * - this function handles the navbar with current active line.
 * - if the line is active only then we will show the navbar and then we will check with value of the locked state, color from the active line object.
 * - and based upon that we will render the canvas again with the new set of the options settings.
 * - this is the first render call itself when the newline is added.
 *
 *
 * @param
 * - takes the id of the line to get the current state of that.
 */

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
  render(); // first render call.
}

/**
 * @description
 * - this method handles the updating the line color and line width based upon the c and w value.
 *
 * - these are called when ever there is event of change in the color or linewidth.
 *
 * @param
 * - c , contiains the current value of c while the w, contains the current value of the linewidth.
 * - after the change has been made the line is render again so as to get the color or width change.
 *
 *
 */

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

/**
 * @description
 * - handles the locked value of the line object toggled as we click the button either on the line's toolbar or over the line menu.
 * - here we call the setActive(id) with id again so as to call the render() and change the UI as the lock state change. Also, this will change the line's object value.
 *
 */

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

/**
 *
 * @description
 * - this method creates the new line based upon the type of the line selected and clicked from the options.
 * - it will create the new line object and push it to the lines array.
 * - the id id generated based upon the current time.
 * - after that it will render the canvas again so as to get the new line added, which will be called in the setActive line.
 *
 *
 * @param
 * - the type here is the string value which can be straight(default), step or curved.
 */

function addNewLine(type) {
  const id = Date.now();
  let newLine = {
    id,
    color: "#3B82F6",
    width: 6,
    start: { x: 400, y: 300 },
    end: { x: 700, y: 300 },
    elbows: [],
    locked: false,
  };
  if (type === "step") {
    newLine.start = { x: 200, y: 300 };
    newLine.end = { x: 500, y: 300 };
    newLine.elbows = [
      { x: 350, y: 300 },
      { x: 350, y: 450 },
    ];
    newLine.end = { x: 500, y: 450 };
  } else if (type === "curved") {
    newLine.start = { x: 200, y: 250 };
    newLine.end = { x: 500, y: 250 };
    newLine.elbows = [{ x: 350, y: 200 }];
  }
  lines.push(newLine);
  setActive(id);
}



/**
 * @description
 * - we will take event double click on the canvas and find the x and y of the cusrsor.
 * - then find the active line and get the all the points (x, y coordinate object) and then get the svg path by the getPath() method.
 * - then we will pass the svg path to the Path which can be used to stroke or check that the user cursor is on the line or not.
 * - we add the linewidth by 20 so as to get the click over the few distance away from the line as well.
 * - then we try to find the min distance between the current cursor of the mouse and nearest part of the line (which is called the segment, this segment is bounded by the two points) from all points and then find the best segment and then at the line segment at a particular x and y we add the point.
 * - after adding we will render the whole canvas again.
 * 
 * @param
 * - the event e which is suppose to be the double click event on the canvas.
 */
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


/**
 * Finds the best segment over which point is to be added.
 * Takes the current user coordinates x and y, and two end points of the current segment.
 * Then tries to find the distance with the endpoints and current cursor position.
 * @param {number} x - The current user's x-coordinate
 * @param {number} y - The current user's y-coordinate
 * @param {{x:number, y:number}} a - The start point of the segment
 * @param {{x:number, y:number}} b - The end point of the segment
 * @returns {number} The distance from the current user coordinates to the line segment
 */
function pToSegDist(x, y, a, b) {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return Math.hypot(x - a.x, y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / l2),
  );
  return Math.hypot(x - (a.x + t * (b.x - a.x)), y - (a.y + t * (b.y - a.y)));
}
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
