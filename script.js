// Enhanced Kanji Practice Class with improved architecture
class EnhancedKanjiPractice {
  constructor() {
    this.currentKanjiData = null;
    this.currentStrokeIndex = 0;
    this.completedStrokes = [];
    this.isDragging = false;
    this.activePath = null;
    this.activeCircle = null;
    this.dragProgress = 0;
    this.circlePosition = { x: 0, y: 0 };

    // Enhanced color palette with better contrast
    this.strokeColors = [
      "#E53E3E",
      "#3182CE",
      "#319795",
      "#38A169",
      "#D69E2E",
      "#9F7AEA",
      "#E56399",
      "#4299E1",
      "#48BB78",
      "#ECC94B",
      "#ED64A6",
      "#4FD1C7",
      "#F687B3",
      "#68D391",
      "#F6E05E",
      "#B794F6",
      "#FBB6CE",
      "#81E6D9",
      "#C6F6D5",
      "#FEFCBF",
    ];

    // Settings
    this.settings = {
      accuracy: 0.9,
      soundEnabled: true,
      hapticEnabled: true,
      directionHints: true,
    };

    this.setupEventListeners();
    this.loadSettings();
  }

  setupEventListeners() {
    document.getElementById("kanjiInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.loadKanji();
      }
    });

    // Settings listeners
    document
      .getElementById("accuracySetting")
      .addEventListener("change", (e) => {
        this.settings.accuracy = parseFloat(e.target.value);
        this.saveSettings();
      });

    document.getElementById("soundSetting").addEventListener("change", (e) => {
      this.settings.soundEnabled = e.target.checked;
      this.saveSettings();
    });

    document.getElementById("hapticSetting").addEventListener("change", (e) => {
      this.settings.hapticEnabled = e.target.checked;
      this.saveSettings();
    });

    document
      .getElementById("directionHintSetting")
      .addEventListener("change", (e) => {
        this.settings.directionHints = e.target.checked;
        this.saveSettings();
      });
  }

  loadSettings() {
    this.updateSettingsUI();
  }

  saveSettings() {
    console.log("Settings updated:", this.settings);
  }

  updateSettingsUI() {
    document.getElementById("accuracySetting").value = this.settings.accuracy;
    document.getElementById("soundSetting").checked =
      this.settings.soundEnabled;
    document.getElementById("hapticSetting").checked =
      this.settings.hapticEnabled;
    document.getElementById("directionHintSetting").checked =
      this.settings.directionHints;
  }

  async loadKanji() {
    const input = document.getElementById("kanjiInput").value.trim();
    if (!input) {
      alert("Vui lòng nhập một kanji!");
      return;
    }

    const kanjiChar = input.charAt(0);
    const unicode = kanjiChar.codePointAt(0);
    const hexCode = unicode.toString(16).padStart(5, "0");

    document.getElementById("practiceBtn").disabled = true;
    document.getElementById("svgDisplay").innerHTML =
      '<div class="loading">Đang tải dữ liệu từ KanjiVG...</div>';

    try {
      const kanjivgUrl = `https://kanjivg.tagaini.net/kanjivg/kanji/${hexCode}.svg`;
      const response = await fetch(kanjivgUrl, { mode: "cors" });

      if (!response.ok) {
        throw new Error(`Không tìm thấy kanji: ${kanjiChar}`);
      }

      const svgText = await response.text();
      await this.parseKanjiSVG(svgText, kanjiChar, unicode);
    } catch (error) {
      console.error("Lỗi khi tải kanji:", error);
      document.getElementById("svgDisplay").innerHTML = `<div class="error">
              <strong>Lỗi:</strong> ${error.message}<br>
              <small>Hãy thử với kanji khác hoặc kiểm tra kết nối mạng</small>
            </div>`;
    } finally {
      document.getElementById("practiceBtn").disabled = false;
    }
  }

  async parseKanjiSVG(svgText, kanjiChar, unicode) {
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const paths = svgDoc.querySelectorAll("path[d]");
      const strokes = [];

      paths.forEach((path, index) => {
        const d = path.getAttribute("d");
        if (d) {
          strokes.push({
            id: `stroke-${index}`,
            path: d,
            order: index + 1,
          });
        }
      });

      this.currentKanjiData = {
        character: kanjiChar,
        unicode: unicode,
        strokes: strokes,
        strokeCount: strokes.length,
      };

      this.resetPracticeState();
      this.createInteractiveSVG();
      this.updateUI();
    } catch (error) {
      throw new Error(`Lỗi khi parse SVG: ${error.message}`);
    }
  }

  resetPracticeState() {
    this.currentStrokeIndex = 0;
    this.completedStrokes = [];
    this.isDragging = false;
    this.activePath = null;
    this.activeCircle = null;
    this.dragProgress = 0;
    this.circlePosition = { x: 0, y: 0 };
  }

  createInteractiveSVG() {
    const strokes = this.currentKanjiData.strokes;
    let svgContent = `
            <svg class="kanji-svg" viewBox="0 0 109 109" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="10.9" height="10.9" patternUnits="userSpaceOnUse">
                  <path d="M 10.9 0 L 0 0 0 10.9" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
                </pattern>
                ${strokes
                  .map(
                    (_, index) => `
                  <marker id="arrowhead-${index}" markerWidth="10" markerHeight="7" 
                          refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="${
                      this.strokeColors[index % this.strokeColors.length]
                    }" opacity="0.7"/>
                  </marker>
                `
                  )
                  .join("")}
              </defs>
              
              <!-- Background -->
              <rect width="109" height="109" fill="url(#grid)" />
              <rect width="109" height="109" fill="none"/>
              
              <!-- Center guidelines -->
              <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#e0e0e0" stroke-width="0.5"/>
              <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#e0e0e0" stroke-width="0.5"/>
          `;

    // Create stroke layers with proper z-index
    strokes.forEach((stroke, index) => {
      const color = this.strokeColors[index % this.strokeColors.length];
      const pathStart = this.getPathStartPoint(stroke.path);
      const pathEnd = this.getPathEndPoint(stroke.path);
      const isActive = index === 0;
      const zIndex = 100 - index; // Higher index = lower z-index

      svgContent += `
              <g class="stroke-layer" style="z-index: ${zIndex}">                
                <!-- Main stroke path -->
                <path 
                  d="${stroke.path}" 
                  fill="none" 
                  stroke="${color}" 
                  stroke-width="5" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  id="stroke-path-${index}"
                  class="stroke-path ${isActive ? "current" : "inactive"}"
                  style="opacity: ${
                    isActive ? "0.3" : "0.1"
                  }; z-index: ${zIndex};"
                />
                
                <!-- Interactive circle -->
                <circle 
                  cx="${pathStart.x}" 
                  cy="${pathStart.y}" 
                  r="3" 
                  fill="${color}" 
                  id="stroke-circle-${index}"
                  class="stroke-circle ${
                    isActive ? "interactive" : "non-interactive"
                  }"
                  style="z-index: ${isActive ? 1000 : zIndex + 1};"
                />
                
                <!-- Stroke number -->
                <text x="${pathStart.x}" y="${pathStart.y}" 
                      class="stroke-number"
                      id="stroke-number-${index}">
                  ${index + 1}
                </text>
              </g>
            `;
    });

    svgContent += "</svg>";
    document.getElementById("svgDisplay").innerHTML = svgContent;
    this.setupInteractiveEvents();
  }

  updateUI() {
    this.createStrokeIndicators();
    this.updateProgressInfo();
  }

  createStrokeIndicators() {
    const container = document.getElementById("strokeIndicators");
    container.innerHTML = "";

    this.currentKanjiData.strokes.forEach((_, index) => {
      const indicator = document.createElement("div");
      indicator.className = "stroke-indicator";
      indicator.id = `indicator-${index}`;
      indicator.textContent = index + 1;

      if (index < this.currentStrokeIndex) {
        indicator.classList.add("completed");
      } else if (index === this.currentStrokeIndex) {
        indicator.classList.add("current");
      } else {
        indicator.classList.add("pending");
      }

      container.appendChild(indicator);
    });
  }

  getPathStartPoint(pathData) {
    const commands = pathData.match(/[ML][^ML]*/g);
    if (commands && commands[0]) {
      const firstCommand = commands[0];
      const coords = firstCommand
        .substring(1)
        .split(/[,\s]+/)
        .map((n) => parseFloat(n));
      return { x: coords[0] || 20, y: coords[1] || 20 };
    }
    return { x: 20, y: 20 };
  }

  getPathEndPoint(pathData) {
    const commands = pathData.match(/[MLZ][^MLZ]*/g);
    if (commands && commands.length > 1) {
      const lastCommand = commands[commands.length - 1];
      if (lastCommand.startsWith("Z")) {
        return this.getPathStartPoint(pathData);
      }
      const coords = lastCommand
        .substring(1)
        .split(/[,\s]+/)
        .map((n) => parseFloat(n));
      return {
        x: coords[coords.length - 2] || 20,
        y: coords[coords.length - 1] || 20,
      };
    }
    return { x: 20, y: 20 };
  }

  setupInteractiveEvents() {
    const svg = document.querySelector(".kanji-svg");
    if (!svg) return;

    // Enhanced event handling with better performance
    const throttle = (func, delay) => {
      let timeoutId;
      let lastExecTime = 0;
      return function (...args) {
        const currentTime = Date.now();
        if (currentTime - lastExecTime > delay) {
          func.apply(this, args);
          lastExecTime = currentTime;
        } else {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            func.apply(this, args);
            lastExecTime = Date.now();
          }, delay - (currentTime - lastExecTime));
        }
      };
    };

    // Mouse events
    svg.addEventListener("mousedown", this.startDrag.bind(this));
    svg.addEventListener("mousemove", throttle(this.handleDrag.bind(this), 16)); // 60fps
    svg.addEventListener("mouseup", this.endDrag.bind(this));
    svg.addEventListener("mouseleave", this.endDrag.bind(this));

    // Touch events
    svg.addEventListener("touchstart", (e) => this.handleTouch(e, "start"));
    svg.addEventListener(
      "touchmove",
      throttle((e) => this.handleTouch(e, "move"), 16)
    );
    svg.addEventListener("touchend", (e) => this.handleTouch(e, "end"));
    svg.addEventListener("touchcancel", (e) => this.handleTouch(e, "end"));
  }

  handleTouch(e, type) {
    e.preventDefault();
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;

    const mouseEventType =
      type === "start"
        ? "mousedown"
        : type === "move"
        ? "mousemove"
        : "mouseup";

    const mouseEvent = new MouseEvent(mouseEventType, {
      clientX: touch.clientX,
      clientY: touch.clientY,
      bubbles: true,
      cancelable: true,
    });

    document.querySelector(".kanji-svg").dispatchEvent(mouseEvent);
  }

  startDrag(e) {
    if (this.currentStrokeIndex >= this.currentKanjiData.strokes.length) return;
    const svg = e.currentTarget || e.target.closest("svg");
    if (!svg) return;
    const svgRect = svg.getBoundingClientRect();
    const x = ((e.clientX - svgRect.left) / svgRect.width) * 109;
    const y = ((e.clientY - svgRect.top) / svgRect.height) * 109;

    const circle = document.getElementById(
      `stroke-circle-${this.currentStrokeIndex}`
    );

    const number = document.getElementById(
      `stroke-number-${this.currentStrokeIndex}`
    );

    if (!circle || !circle.classList.contains("interactive")) return;

    const pathStart = this.getPathStartPoint(
      this.currentKanjiData.strokes[this.currentStrokeIndex].path
    );
    const distance = Math.sqrt(
      Math.pow(x - pathStart.x, 2) + Math.pow(y - pathStart.y, 2)
    );

    if (distance <= 12) {
      // Increased touch area for better mobile experience
      this.isDragging = true;
      this.activePath = document.getElementById(
        `stroke-path-${this.currentStrokeIndex}`
      );
      this.activeCircle = circle;
      this.dragProgress = 0;
      this.circlePosition = { x: pathStart.x, y: pathStart.y };

      // Enhanced visual feedback
      circle.classList.add("active");
      circle.style.transform = "scale(1)";
      this.activePath.classList.add("drawing");
      this.activePath.style.zIndex = "1000";

      // Initialize stroke drawing with enhanced animation
      const pathLength = this.activePath.getTotalLength();
      this.activePath.style.strokeDasharray = "none";
      this.activePath.style.strokeDashoffset = "0";
      this.activePath.style.opacity = "0.1";

      // Haptic feedback
      this.triggerHapticFeedback();

      // Sound feedback
      this.playSound("start");
    }
  }

  // handleDrag(e) {
  //   if (!this.isDragging || !this.activePath || !this.activeCircle)
  //     return;

  //   const svg = e.currentTarget || e.target.closest("svg");
  //   if (!svg) return;
  //   const svgRect = svg.getBoundingClientRect();
  //   const x = ((e.clientX - svgRect.left) / svgRect.width) * 109;
  //   const y = ((e.clientY - svgRect.top) / svgRect.height) * 109;

  //   // Enhanced path following calculation
  //   const pathLength = this.activePath.getTotalLength();
  //   let closestPoint = null;
  //   let minDistance = Infinity;
  //   let closestProgress = 0;

  //   // More detailed sampling for better accuracy
  //   const sampleCount = Math.max(50, Math.min(200, pathLength / 2));
  //   for (let i = 0; i <= sampleCount; i++) {
  //     const progress = i / sampleCount;
  //     const point = this.activePath.getPointAtLength(
  //       progress * pathLength
  //     );
  //     const distance = Math.sqrt(
  //       Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
  //     );

  //     if (distance < minDistance) {
  //       minDistance = distance;
  //       closestPoint = point;
  //       closestProgress = progress;
  //     }
  //   }

  //   // Enhanced progress validation with tolerance
  //   const tolerance = 20; // Increased tolerance for better UX
  //   if (closestProgress > this.dragProgress && minDistance < tolerance) {
  //     this.dragProgress = closestProgress;

  //     // Dynamic opacity based on progress
  //     const opacity = 0.2 + this.dragProgress * 0.8;
  //     this.activePath.style.opacity = opacity;

  //     // Update circle position in real-time
  //     this.updateCirclePosition(closestPoint);

  //     // Update progress bar
  //     this.updateProgressBar();
  //   }
  // }

  handleDrag(e) {
    if (!this.isDragging || !this.activePath || !this.activeCircle) return;

    const svg = e.currentTarget || e.target.closest("svg");
    if (!svg) return;
    const svgRect = svg.getBoundingClientRect();
    const x = ((e.clientX - svgRect.left) / svgRect.width) * 109;
    const y = ((e.clientY - svgRect.top) / svgRect.height) * 109;

    const pathLength = this.activePath.getTotalLength();
    let closestPoint = null;
    let minDistance = Infinity;
    let closestProgress = 0;

    const sampleCount = Math.max(50, Math.min(200, pathLength / 2));
    for (let i = 0; i <= sampleCount; i++) {
      const progress = i / sampleCount;
      const point = this.activePath.getPointAtLength(progress * pathLength);
      const distance = Math.sqrt(
        Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
        closestProgress = progress;
      }
    }

    const tolerance = 20;
    const drawingSpeed = 0.6;

    if (closestProgress > this.dragProgress && minDistance < tolerance) {
      this.dragProgress += (closestProgress - this.dragProgress) * drawingSpeed;

      // Dynamic opacity based on progress
      const opacity = 0.2 + this.dragProgress * 0.8;
      this.activePath.style.opacity = opacity;

      // Update circle position
      this.updateCirclePosition(closestPoint);

      // Update progress bar
      this.updateProgressBar();
    }
  }

  updateCirclePosition(point) {
    if (this.activeCircle && point) {
      this.circlePosition = point;
      this.activeCircle.setAttribute("cx", point.x);
      this.activeCircle.setAttribute("cy", point.y);

      // Update stroke number position
      const numberEl = document.getElementById(
        `stroke-number-${this.currentStrokeIndex}`
      );
      if (numberEl) {
        numberEl.setAttribute("x", point.x);
        numberEl.setAttribute("y", point.y);
      }
    }
  }

  endDrag(e) {
    if (!this.isDragging) return;

    this.isDragging = false;
    const completionThreshold = this.settings.accuracy;

    if (this.activePath && this.dragProgress >= completionThreshold) {
      // Stroke completed successfully
      this.completeCurrentStroke();
    } else {
      // Reset incomplete stroke with animation
      this.resetIncompleteStroke();
    }

    // Reset drag state
    this.activePath = null;
    this.activeCircle = null;
    this.dragProgress = 0;
  }

  completeCurrentStroke() {
    // Enhanced completion animation
    this.activePath.style.opacity = "1";
    this.activePath.style.strokeDasharray = "none";
    this.activePath.classList.remove("drawing");
    this.activePath.classList.add("completed");

    this.activeCircle.classList.remove("active", "interactive");
    this.activeCircle.classList.add("completed");
    this.activeCircle.style.opacity = "1";

    // Update stroke number position
    const numberEl = document.getElementById(
      `stroke-number-${this.currentStrokeIndex}`
    );

    // Add completion particles
    const currentCircleX = parseFloat(this.activeCircle.getAttribute("cx"));
    const currentCircleY = parseFloat(this.activeCircle.getAttribute("cy"));
    const currentCirclePosition = {
      x: currentCircleX,
      y: currentCircleY,
    };
    this.createCompletionParticles(currentCirclePosition);

    // Update progress
    this.completedStrokes.push(this.currentStrokeIndex);
    this.currentStrokeIndex++;

    // Activate next stroke or complete kanji
    if (this.currentStrokeIndex < this.currentKanjiData.strokes.length) {
      setTimeout(() => this.activateNextStroke(), 300);
    } else {
      setTimeout(() => this.completeKanji(), 500);
    }

    // Update UI
    this.updateProgressInfo();
    this.updateStrokeIndicators();

    // Feedback
    this.triggerHapticFeedback("success");
    this.playSound("complete");
  }

  activateNextStroke() {
    const nextCircle = document.getElementById(
      `stroke-circle-${this.currentStrokeIndex}`
    );
    const nextPath = document.getElementById(
      `stroke-path-${this.currentStrokeIndex}`
    );

    if (nextCircle && nextPath) {
      // Reset circle transition
      nextCircle.style.transition = "";

      nextCircle.classList.remove("non-interactive");
      nextCircle.classList.add("interactive");
      nextCircle.style.opacity = "1";
      nextCircle.style.transform = "scale(1)";
      nextCircle.style.zIndex = "10000";

      nextPath.style.opacity = "0.4";
      nextPath.classList.remove("inactive");
      nextPath.classList.add("current");
    }
  }

  resetIncompleteStroke() {
    if (this.activePath && this.activeCircle) {
      // Smooth reset animation
      // this.activePath.style.transition = "all 0.3s ease";
      this.activePath.style.strokeDasharray = "none";
      this.activePath.style.strokeDashoffset = "0";
      this.activePath.style.opacity = "0.3";
      this.activePath.style.filter = "";
      this.activePath.classList.remove("drawing");

      // Reset circle position
      const pathStart = this.getPathStartPoint(
        this.currentKanjiData.strokes[this.currentStrokeIndex].path
      );
      this.activeCircle.setAttribute("cx", pathStart.x);
      this.activeCircle.setAttribute("cy", pathStart.y);
      this.activeCircle.classList.remove("active");
      this.activeCircle.style.transform = "scale(1)";

      // Reset stroke number position
      const numberEl = document.getElementById(
        `stroke-number-${this.currentStrokeIndex}`
      );
      if (numberEl) {
        numberEl.setAttribute("x", pathStart.x);
        numberEl.setAttribute("y", pathStart.y);
      }

      // Remove transition after animation
      setTimeout(() => {
        if (this.activePath) this.activePath.style.transition = "";
        if (this.activeCircle) this.activeCircle.style.transition = "";
      }, 300);
    }
  }

  createCompletionParticles(center) {
    const svg = document.querySelector(".kanji-svg");
    if (!svg) return;

    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 20 + Math.random() * 10;

      particle.setAttribute("cx", center.x);
      particle.setAttribute("cy", center.y);
      particle.setAttribute("r", 2 + Math.random() * 2);
      particle.setAttribute(
        "fill",
        this.strokeColors[this.currentStrokeIndex % this.strokeColors.length]
      );
      particle.setAttribute("opacity", "0.8");
      particle.classList.add("particle");

      // Animate particle
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);

      svg.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => particle.remove(), 1000);
    }
  }

  completeKanji() {
    this.showCompletionMessage();
    this.triggerHapticFeedback("celebration");
    this.playSound("victory");

    // Celebration animation for all strokes
    this.currentKanjiData.strokes.forEach((_, index) => {
      const path = document.getElementById(`stroke-path-${index}`);
      if (path) {
        setTimeout(() => {
          path.style.animation = "celebration 0.6s ease-out";
        }, index * 100);
      }
    });
  }

  updateProgressInfo() {
    const progressEl = document.getElementById("progressInfo");
    const total = this.currentKanjiData.strokes.length;

    if (this.currentStrokeIndex >= total) {
      progressEl.textContent = `🎉 Hoàn thành! Tất cả ${total} nét đã được vẽ xuất sắc!`;
    } else {
      progressEl.textContent = `Nét ${
        this.currentStrokeIndex + 1
      }/${total} - Kéo circle theo đường nét (${Math.round(
        this.settings.accuracy * 100
      )}% để hoàn thành)`;
    }
  }

  updateProgressBar() {
    const progressBar = document.getElementById("progressBar");
    const strokeProgress =
      (this.currentStrokeIndex / this.currentKanjiData.strokes.length) * 100;
    const currentStrokeProgress =
      (this.dragProgress / this.currentKanjiData.strokes.length) * 100;
    const totalProgress = strokeProgress + currentStrokeProgress;

    progressBar.style.width = `${Math.min(100, totalProgress)}%`;
  }

  updateStrokeIndicators() {
    this.currentKanjiData.strokes.forEach((_, index) => {
      const indicator = document.getElementById(`indicator-${index}`);
      if (indicator) {
        indicator.className = "stroke-indicator";
        if (index < this.currentStrokeIndex) {
          indicator.classList.add("completed");
        } else if (index === this.currentStrokeIndex) {
          indicator.classList.add("current");
        } else {
          indicator.classList.add("pending");
        }
      }
    });
  }

  showCompletionMessage() {
    const container = document.body;
    const toastDiv = document.createElement("div");
    toastDiv.className = "toast-message";
    toastDiv.innerHTML = `
            🎊 Xuất sắc! 🎊<br>
          `;

    container.appendChild(toastDiv);

    setTimeout(() => {
      toastDiv.remove();
    }, 3000);
  }

  resetPractice() {
    if (!this.currentKanjiData) return;

    this.resetPracticeState();

    // Reset all visual states with enhanced animations
    this.currentKanjiData.strokes.forEach((stroke, index) => {
      const path = document.getElementById(`stroke-path-${index}`);
      const circle = document.getElementById(`stroke-circle-${index}`);
      const number = document.getElementById(`stroke-number-${index}`);

      if (path && circle) {
        // Reset path
        path.style.opacity = index === 0 ? "0.3" : "0.1";
        path.style.strokeDasharray = "none";
        path.style.strokeDashoffset = "0";
        path.style.filter = "";
        path.style.animation = "";
        path.classList.remove("drawing", "completed");
        path.classList.toggle("current", index === 0);
        path.classList.toggle("inactive", index !== 0);

        // Reset circle
        const pathStart = this.getPathStartPoint(stroke.path);
        circle.setAttribute("cx", pathStart.x);
        circle.setAttribute("cy", pathStart.y);
        circle.classList.remove(
          "active",
          "completed",
          "non-interactive",
          "interactive"
        );
        circle.style.transform = "scale(1)";
        circle.style.zIndex = index === 0 ? "1000" : "auto";

        if (index === 0) {
          circle.classList.add("interactive");
          circle.style.opacity = "1";
        } else {
          circle.classList.add("non-interactive");
          circle.style.opacity = "0.3";
        }

        // Reset number position
        if (number) {
          number.setAttribute("x", pathStart.x);
          number.setAttribute("y", pathStart.y);
        }

        // Remove transition after animation
        setTimeout(() => {
          circle.style.transition = "";
        }, 300);
      }
    });

    this.updateProgressInfo();
    this.updateStrokeIndicators();
    this.updateProgressBar();
  }

  animateStrokes() {
    if (!this.currentKanjiData) {
      alert("Vui lòng tải một kanji trước!");
      return;
    }

    this.resetPractice();

    const svg = document.querySelector(".kanji-svg");
    if (!svg) return;

    // Enhanced demo animation
    this.currentKanjiData.strokes.forEach((stroke, index) => {
      setTimeout(() => {
        const path = document.getElementById(`stroke-path-${index}`);
        const circle = document.getElementById(`stroke-circle-${index}`);

        if (path && circle) {
          const pathLength = path.getTotalLength();
          const pathStart = this.getPathStartPoint(stroke.path);
          const pathEnd = this.getPathEndPoint(stroke.path);

          // Prepare animation
          path.style.strokeDasharray = pathLength;
          path.style.strokeDashoffset = pathLength;
          path.style.opacity = "1";

          // Animate stroke drawing
          path.style.transition =
            "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)";
          path.style.strokeDashoffset = "0";

          // Update number position
          const numberEl = document.getElementById(`stroke-number-${index}`);
          // Complete animation
          setTimeout(() => {
            path.style.strokeDasharray = "none";
            path.style.transition = "";
            path.style.filter = "";
            circle.style.transition = "";
            if (numberEl) numberEl.style.transition = "";
          }, 1500);
        }
      }, index * 500);
    });

    // Play demo sound
    this.playSound("demo");
  }

  triggerHapticFeedback(type = "light") {
    if (!this.settings.hapticEnabled || !navigator.vibrate) return;

    const patterns = {
      light: [10],
      success: [10, 50, 10],
      celebration: [100, 50, 100, 50, 100],
    };

    navigator.vibrate(patterns[type] || patterns.light);
  }

  playSound(type) {
    if (!this.settings.soundEnabled) return;

    // Create audio context for sound generation
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const frequencies = {
        start: 440,
        complete: 660,
        victory: [523, 659, 784], // C, E, G chord
        demo: 330,
      };

      const freq = frequencies[type] || 440;

      if (Array.isArray(freq)) {
        // Play chord for victory
        freq.forEach((f, i) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(
              0.01,
              audioCtx.currentTime + 0.5
            );
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
          }, i * 100);
        });
      } else {
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.2
        );
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      }
    } catch (error) {
      console.log("Audio not supported:", error);
    }
  }
}

// Initialize the enhanced kanji practice
const kanjiPractice = new EnhancedKanjiPractice();

// Load default kanji on page load
window.addEventListener("load", () => {
  document.getElementById("kanjiInput").value = "一";
  kanjiPractice.loadKanji();
});
