class AdvancedDrawingApp {
  constructor() {
    this.canvas = document.getElementById("canvas")
    this.ctx = this.canvas.getContext("2d")
    this.gridCanvas = document.getElementById("gridCanvas")
    this.gridCtx = this.gridCanvas.getContext("2d")

    // Drawing state
    this.isDrawing = false
    this.currentTool = "pen"
    this.strokeColor = "#2563eb"
    this.fillColor = "#3b82f6"
    this.brushSize = 5
    this.brushOpacity = 100
    this.fillOpacity = 100
    this.fillMode = "solid"

    // Drawing coordinates
    this.startX = 0
    this.startY = 0
    this.lastX = 0
    this.lastY = 0

    // History management
    this.history = []
    this.historyStep = -1
    this.maxHistorySteps = 50

    // Zoom and pan
    this.zoom = 1
    this.panX = 0
    this.panY = 0
    this.isPanning = false
    this.lastPanX = 0
    this.lastPanY = 0

    // UI state
    this.showGrid = false
    this.isFullscreen = false

    // Performance optimization
    this.animationId = null
    this.isProcessing = false

    this.init()

    window.drawingApp = this
  }

  init() {
    this.setupCanvas()
    this.setupEventListeners()
    this.updateUI()
    this.saveState()
    this.updateStatus("Ready to draw!")
  }

  setupCanvas() {
    this.resizeCanvas()
    window.addEventListener("resize", () => this.resizeCanvas())

    // Set canvas properties
    this.ctx.lineCap = "round"
    this.ctx.lineJoin = "round"
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = "high"

    // Apply initial styles
    this.updateCanvasStyles()
  }

  resizeCanvas() {
    const container = this.canvas.parentElement
    const rect = container.getBoundingClientRect()

    // Store current canvas data
    const imageData = this.canvas.width > 0 ? this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height) : null

    // Set canvas size
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.gridCanvas.width = rect.width
    this.gridCanvas.height = rect.height

    // Restore canvas properties
    this.ctx.lineCap = "round"
    this.ctx.lineJoin = "round"
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = "high"

    // Restore canvas data
    if (imageData && imageData.width > 0) {
      this.ctx.putImageData(imageData, 0, 0)
    }

    this.updateCanvasStyles()
    this.drawGrid()
    this.applyTransform()
  }

  updateCanvasStyles() {
    this.ctx.strokeStyle = this.strokeColor
    this.ctx.fillStyle = this.fillColor
    this.ctx.lineWidth = this.brushSize
    this.ctx.globalAlpha = this.brushOpacity / 100
  }

  setupEventListeners() {
    this.setupToolEvents()
    this.setupColorEvents()
    this.setupSliderEvents()
    this.setupActionEvents()
    this.setupCanvasEvents()
    this.setupKeyboardEvents()
    this.setupUIEvents()
  }

  setupToolEvents() {
    // Tool selection
    document.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.selectTool(e.target.dataset.tool)
        this.updateActiveButton(e.target)
      })
    })
  }

  setupColorEvents() {
    // Color pickers
    const strokeInputs = ["strokeColor", "strokeColorMobile"]
    const fillInputs = ["fillColor", "fillColorMobile"]

    strokeInputs.forEach((id) => {
      const input = document.getElementById(id)
      if (input) {
        input.addEventListener("change", (e) => {
          this.strokeColor = e.target.value
          this.updateCanvasStyles()
          this.syncColorInputs(strokeInputs, e.target.value)
          this.updateColorPreviews()
        })
      }
    })

    fillInputs.forEach((id) => {
      const input = document.getElementById(id)
      if (input) {
        input.addEventListener("change", (e) => {
          this.fillColor = e.target.value
          this.updateCanvasStyles()
          this.syncColorInputs(fillInputs, e.target.value)
          this.updateColorPreviews()
        })
      }
    })

    // Color palette
    document.querySelectorAll(".palette-color").forEach((color) => {
      color.addEventListener("click", (e) => {
        const colorValue = e.target.dataset.color
        if (
          this.currentTool === "fill" ||
          this.currentTool.includes("rectangle") ||
          this.currentTool.includes("circle")
        ) {
          this.fillColor = colorValue
          this.syncColorInputs(fillInputs, colorValue)
        } else {
          this.strokeColor = colorValue
          this.syncColorInputs(strokeInputs, colorValue)
        }
        this.updateCanvasStyles()
        this.updateColorPreviews()
      })
    })

    // Fill mode selector
    document.querySelectorAll(".fill-mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.fillMode = e.target.dataset.mode
        document.querySelectorAll(".fill-mode-btn").forEach((b) => b.classList.remove("active"))
        e.target.classList.add("active")
      })
    })
  }

  setupSliderEvents() {
    // Brush size
    const brushSizeInputs = ["brushSize", "brushSizeMobile"]
    brushSizeInputs.forEach((id) => {
      const input = document.getElementById(id)
      if (input) {
        input.addEventListener("input", (e) => {
          this.brushSize = Number.parseInt(e.target.value)
          this.updateCanvasStyles()
          this.syncSliderInputs(brushSizeInputs, e.target.value)
          this.updateBrushPreview()

          const sizeDisplay = document.getElementById("brushSizeValue")
          if (sizeDisplay) sizeDisplay.textContent = `${this.brushSize}px`
        })
      }
    })

    // Brush opacity
    const brushOpacityInput = document.getElementById("brushOpacity")
    if (brushOpacityInput) {
      brushOpacityInput.addEventListener("input", (e) => {
        this.brushOpacity = Number.parseInt(e.target.value)
        this.updateCanvasStyles()

        const opacityDisplay = document.getElementById("brushOpacityValue")
        if (opacityDisplay) opacityDisplay.textContent = `${this.brushOpacity}%`
      })
    }

    // Fill opacity
    const fillOpacityInput = document.getElementById("fillOpacity")
    if (fillOpacityInput) {
      fillOpacityInput.addEventListener("input", (e) => {
        this.fillOpacity = Number.parseInt(e.target.value)

        const opacityDisplay = document.getElementById("fillOpacityValue")
        if (opacityDisplay) opacityDisplay.textContent = `${this.fillOpacity}%`
      })
    }
  }

  setupActionEvents() {
    // Undo/Redo
    const undoBtns = ["undoBtn", "undoBtnMobile"]
    const redoBtns = ["redoBtn", "redoBtnMobile"]

    undoBtns.forEach((id) => {
      const btn = document.getElementById(id)
      if (btn) btn.addEventListener("click", () => this.undo())
    })

    redoBtns.forEach((id) => {
      const btn = document.getElementById(id)
      if (btn) btn.addEventListener("click", () => this.redo())
    })

    // Clear canvas
    const clearBtns = ["clearBtn", "clearBtnMobile"]
    clearBtns.forEach((id) => {
      const btn = document.getElementById(id)
      if (btn) btn.addEventListener("click", () => this.clearCanvas())
    })

    // Fill canvas
    const fillCanvasBtn = document.getElementById("fillCanvasBtn")
    if (fillCanvasBtn) {
      fillCanvasBtn.addEventListener("click", () => this.fillCanvas())
    }

    // Save image
    const saveBtns = ["saveBtn", "saveBtnMobile"]
    saveBtns.forEach((id) => {
      const btn = document.getElementById(id)
      if (btn) btn.addEventListener("click", () => this.saveImage())
    })

    // Import image
    const imageInputs = ["imageInput", "imageInputMobile"]
    imageInputs.forEach((id) => {
      const input = document.getElementById(id)
      if (input) {
        input.addEventListener("change", (e) => this.importImage(e))
      }
    })

    // Zoom controls
    document.getElementById("zoomInBtn")?.addEventListener("click", () => this.zoomIn())
    document.getElementById("zoomOutBtn")?.addEventListener("click", () => this.zoomOut())
    document.getElementById("resetZoomBtn")?.addEventListener("click", () => this.resetZoom())
  }

  setupUIEvents() {
    // Grid toggle
    document.getElementById("gridToggle")?.addEventListener("click", () => this.toggleGrid())

    // Fullscreen toggle
    document.getElementById("fullscreenBtn")?.addEventListener("click", () => this.toggleFullscreen())
  }

  setupCanvasEvents() {
    // Mouse events
    this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e))
    this.canvas.addEventListener("mousemove", (e) => this.draw(e))
    this.canvas.addEventListener("mouseup", () => this.stopDrawing())
    this.canvas.addEventListener("mouseout", () => this.stopDrawing())

    // Touch events
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      this.canvas.dispatchEvent(mouseEvent)
    })

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      this.canvas.dispatchEvent(mouseEvent)
    })

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault()
      this.stopDrawing()
    })

    // Wheel event for zoom
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault()

      const rect = this.canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Calculate world coordinates of mouse
      const worldX = (mouseX - this.panX) / this.zoom
      const worldY = (mouseY - this.panY) / this.zoom

      // Update zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, this.zoom * delta))

      if (newZoom !== this.zoom) {
        this.zoom = newZoom

        // Adjust pan to keep mouse position stable
        this.panX = mouseX - worldX * this.zoom
        this.panY = mouseY - worldY * this.zoom

        this.applyTransform()
        this.updateZoomDisplay()
      }
    })

    // Context menu prevention
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault())
  }

  setupKeyboardEvents() {
    document.addEventListener("keydown", (e) => {
      // Prevent default for our shortcuts
      if ((e.ctrlKey || e.metaKey) && ["z", "y", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "z":
            if (e.shiftKey) {
              this.redo()
            } else {
              this.undo()
            }
            break
          case "y":
            this.redo()
            break
          case "s":
            this.saveImage()
            break
        }
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case "p":
          this.selectTool("pen")
          this.updateActiveButtonByTool("pen")
          break
        case "b":
          this.selectTool("brush")
          this.updateActiveButtonByTool("brush")
          break
        case "e":
          this.selectTool("eraser")
          this.updateActiveButtonByTool("eraser")
          break
        case "f":
          this.selectTool("fill")
          this.updateActiveButtonByTool("fill")
          break
        case "l":
          this.selectTool("line")
          this.updateActiveButtonByTool("line")
          break
        case "r":
          this.selectTool("rectangle")
          this.updateActiveButtonByTool("rectangle")
          break
        case "c":
          this.selectTool("circle")
          this.updateActiveButtonByTool("circle")
          break
        case "t":
          this.selectTool("triangle")
          this.updateActiveButtonByTool("triangle")
          break
        case "g":
          this.toggleGrid()
          break
      }
    })
  }

  // Drawing methods
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height

    return {
      x: ((e.clientX - rect.left) * scaleX) / this.zoom - this.panX / this.zoom,
      y: ((e.clientY - rect.top) * scaleY) / this.zoom - this.panY / this.zoom,
    }
  }

  startDrawing(e) {
    if (e.button === 1 || (e.ctrlKey && !["fill"].includes(this.currentTool))) {
      this.isPanning = true
      this.lastPanX = e.clientX
      this.lastPanY = e.clientY
      this.canvas.style.cursor = "grabbing"
      return
    }

    this.isDrawing = true
    const pos = this.getMousePos(e)
    this.startX = pos.x
    this.startY = pos.y
    this.lastX = pos.x
    this.lastY = pos.y

    this.updateStatus("Drawing...")

    switch (this.currentTool) {
      case "pen":
      case "brush":
        this.ctx.globalCompositeOperation = "source-over"
        this.ctx.globalAlpha = this.brushOpacity / 100
        this.ctx.beginPath()
        this.ctx.moveTo(this.startX, this.startY)
        break
      case "eraser":
        this.ctx.globalCompositeOperation = "destination-out"
        this.ctx.globalAlpha = 1
        this.ctx.beginPath()
        this.ctx.moveTo(this.startX, this.startY)
        break
      case "fill":
        this.floodFill(Math.floor(this.startX), Math.floor(this.startY))
        this.stopDrawing()
        return
    }
  }

  draw(e) {
    if (this.isPanning) {
      const deltaX = e.clientX - this.lastPanX
      const deltaY = e.clientY - this.lastPanY
      this.panX += deltaX
      this.panY += deltaY
      this.lastPanX = e.clientX
      this.lastPanY = e.clientY
      this.applyTransform()
      return
    }

    if (!this.isDrawing) return

    const pos = this.getMousePos(e)

    switch (this.currentTool) {
      case "pen":
        this.ctx.lineTo(pos.x, pos.y)
        this.ctx.stroke()
        break
      case "brush":
        this.drawBrushStroke(this.lastX, this.lastY, pos.x, pos.y)
        break
      case "eraser":
        this.ctx.lineTo(pos.x, pos.y)
        this.ctx.stroke()
        break
      case "line":
      case "rectangle":
      case "circle":
      case "triangle":
        // Clear canvas and redraw from history, then draw preview shape
        this.clearCanvasForPreview()
        this.drawShape(this.startX, this.startY, pos.x, pos.y)
        break
    }

    this.lastX = pos.x
    this.lastY = pos.y
  }

  stopDrawing() {
    if (this.isPanning) {
      this.isPanning = false
      this.canvas.style.cursor = this.getCursorForTool()
      return
    }

    if (!this.isDrawing) return
    this.isDrawing = false

    this.ctx.globalCompositeOperation = "source-over"
    this.ctx.globalAlpha = this.brushOpacity / 100

    this.saveState()
    this.updateStatus("Ready to draw!")
  }

  drawBrushStroke(x1, y1, x2, y2) {
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    const steps = Math.max(1, Math.floor(distance / 2))

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = x1 + (x2 - x1) * t
      const y = y1 + (y2 - y1) * t

      this.ctx.beginPath()
      this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  drawShape(startX, startY, endX, endY) {
    this.ctx.strokeStyle = this.strokeColor
    this.ctx.fillStyle = this.fillColor
    this.ctx.lineWidth = this.brushSize
    this.ctx.globalAlpha = this.fillOpacity / 100

    switch (this.currentTool) {
      case "line":
        this.ctx.globalAlpha = this.brushOpacity / 100
        this.ctx.beginPath()
        this.ctx.moveTo(startX, startY)
        this.ctx.lineTo(endX, endY)
        this.ctx.stroke()
        break
      case "rectangle":
        const width = endX - startX
        const height = endY - startY
        this.ctx.fillRect(startX, startY, width, height)
        this.ctx.globalAlpha = this.brushOpacity / 100
        this.ctx.strokeRect(startX, startY, width, height)
        break
      case "circle":
        const radius = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)
        this.ctx.beginPath()
        this.ctx.arc(startX, startY, radius, 0, 2 * Math.PI)
        this.ctx.fill()
        this.ctx.globalAlpha = this.brushOpacity / 100
        this.ctx.stroke()
        break
      case "triangle":
        const centerX = (startX + endX) / 2
        this.ctx.beginPath()
        this.ctx.moveTo(centerX, startY)
        this.ctx.lineTo(startX, endY)
        this.ctx.lineTo(endX, endY)
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.globalAlpha = this.brushOpacity / 100
        this.ctx.stroke()
        break
    }
  }

  floodFill(x, y) {
    if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) return

    this.showLoading(true)
    this.updateStatus("Filling area...")

    setTimeout(() => {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      const targetColor = this.getPixelColor(imageData, x, y)
      const fillColor = this.hexToRgb(this.fillColor)

      if (this.colorsMatch(targetColor, fillColor)) {
        this.showLoading(false)
        this.updateStatus("Ready to draw!")
        return
      }

      const stack = [[x, y]]
      const visited = new Set()

      while (stack.length > 0) {
        const [currentX, currentY] = stack.pop()
        const key = `${currentX},${currentY}`

        if (visited.has(key)) continue
        visited.add(key)

        if (currentX < 0 || currentX >= this.canvas.width || currentY < 0 || currentY >= this.canvas.height) continue

        const currentColor = this.getPixelColor(imageData, currentX, currentY)
        if (!this.colorsMatch(currentColor, targetColor)) continue

        this.setPixelColor(imageData, currentX, currentY, fillColor)

        stack.push([currentX + 1, currentY])
        stack.push([currentX - 1, currentY])
        stack.push([currentX, currentY + 1])
        stack.push([currentX, currentY - 1])
      }

      this.ctx.putImageData(imageData, 0, 0)
      this.saveState()
      this.showLoading(false)
      this.updateStatus("Area filled!")
    }, 10)
  }

  getPixelColor(imageData, x, y) {
    const index = (y * imageData.width + x) * 4
    return {
      r: imageData.data[index],
      g: imageData.data[index + 1],
      b: imageData.data[index + 2],
      a: imageData.data[index + 3],
    }
  }

  setPixelColor(imageData, x, y, color) {
    const index = (y * imageData.width + x) * 4
    imageData.data[index] = color.r
    imageData.data[index + 1] = color.g
    imageData.data[index + 2] = color.b
    imageData.data[index + 3] = Math.floor(255 * (this.fillOpacity / 100))
  }

  colorsMatch(color1, color2, tolerance = 0) {
    return (
      Math.abs(color1.r - color2.r) <= tolerance &&
      Math.abs(color1.g - color2.g) <= tolerance &&
      Math.abs(color1.b - color2.b) <= tolerance
    )
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  // Tool and UI methods
  selectTool(tool) {
    this.currentTool = tool
    this.canvas.style.cursor = this.getCursorForTool()
    this.updateStatus(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`)
  }

  getCursorForTool() {
    switch (this.currentTool) {
      case "eraser":
        return "grab"
      case "fill":
        return "crosshair"
      default:
        return "crosshair"
    }
  }

  updateActiveButton(activeBtn) {
    document.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.classList.remove("active")
    })

    const tool = activeBtn.dataset.tool
    document.querySelectorAll(`[data-tool="${tool}"]`).forEach((btn) => {
      btn.classList.add("active")
    })
  }

  updateActiveButtonByTool(tool) {
    document.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.querySelectorAll(`[data-tool="${tool}"]`).forEach((btn) => {
      btn.classList.add("active")
    })
  }

  // History management
  saveState() {
    this.historyStep++
    if (this.historyStep < this.history.length) {
      this.history.length = this.historyStep
    }
    this.history.push(this.canvas.toDataURL())

    if (this.history.length > this.maxHistorySteps) {
      this.history.shift()
      this.historyStep--
    }
  }

  undo() {
    if (this.historyStep > 0) {
      this.historyStep--
      this.restoreState()
      this.updateStatus("Undo")
    }
  }

  redo() {
    if (this.historyStep < this.history.length - 1) {
      this.historyStep++
      this.restoreState()
      this.updateStatus("Redo")
    }
  }

  restoreState() {
    const img = new Image()
    img.onload = () => {
      // Save current transform
      const currentTransform = this.ctx.getTransform()

      // Reset transform for clearing
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      // Draw the image at original size
      this.ctx.drawImage(img, 0, 0)

      // Restore transform
      this.ctx.setTransform(currentTransform)
    }
    img.src = this.history[this.historyStep]
  }

  redrawCanvas() {
    if (this.historyStep >= 0) {
      const img = new Image()
      img.onload = () => {
        // Save current transform
        const currentTransform = this.ctx.getTransform()

        // Reset transform for clearing
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // Draw the image at original size
        this.ctx.drawImage(img, 0, 0)

        // Restore transform
        this.ctx.setTransform(currentTransform)
      }
      img.src = this.history[this.historyStep]
    }
  }

  // Canvas actions
  clearCanvas() {
    if (confirm("Are you sure you want to clear the canvas?")) {
      this.ctx.clearRect(
        -this.panX / this.zoom,
        -this.panY / this.zoom,
        this.canvas.width / this.zoom,
        this.canvas.height / this.zoom,
      )
      this.saveState()
      this.updateStatus("Canvas cleared")
    }
  }

  fillCanvas() {
    const originalAlpha = this.ctx.globalAlpha
    this.ctx.globalAlpha = this.fillOpacity / 100
    this.ctx.fillStyle = this.fillColor
    this.ctx.fillRect(
      -this.panX / this.zoom,
      -this.panY / this.zoom,
      this.canvas.width / this.zoom,
      this.canvas.height / this.zoom,
    )
    this.ctx.globalAlpha = originalAlpha
    this.saveState()
    this.updateStatus("Canvas filled")
  }

  // Import/Export
  importImage(e) {
    const file = e.target.files[0]
    if (!file) return

    this.showLoading(true)
    this.updateStatus("Importing image...")

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height)
        const x = (this.canvas.width - img.width * scale) / 2
        const y = (this.canvas.height - img.height * scale) / 2

        this.ctx.drawImage(
          img,
          x / this.zoom - this.panX / this.zoom,
          y / this.zoom - this.panY / this.zoom,
          (img.width * scale) / this.zoom,
          (img.height * scale) / this.zoom,
        )
        this.saveState()
        this.showLoading(false)
        this.updateStatus("Image imported successfully!")
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  saveImage() {
    // Create and show naming modal
    this.showSaveDialog()
  }

  showSaveDialog() {
    const modal = document.createElement("div")
    modal.className = "modal-overlay visible"
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Save Drawing</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">File Name:</label>
            <input type="text" id="saveFileName" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: var(--radius); font-size: 14px;" 
                   value="my-drawing" placeholder="Enter file name">
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Format:</label>
            <select id="saveFormat" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: var(--radius); font-size: 14px;">
              <option value="png">PNG (Recommended)</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="padding: 12px 24px; border: 2px solid var(--border); background: var(--surface); border-radius: var(--radius); cursor: pointer;">
              Cancel
            </button>
            <button onclick="window.drawingApp.performSave()" 
                    style="padding: 12px 24px; border: none; background: var(--primary-color); color: white; border-radius: var(--radius); cursor: pointer;">
              Save Drawing
            </button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Focus on filename input
    setTimeout(() => {
      const input = document.getElementById("saveFileName")
      if (input) {
        input.focus()
        input.select()
      }
    }, 100)

    // Handle Enter key
    modal.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.performSave()
      } else if (e.key === "Escape") {
        modal.remove()
      }
    })
  }

  performSave() {
    const modal = document.querySelector(".modal-overlay")
    const fileName = document.getElementById("saveFileName")?.value || "my-drawing"
    const format = document.getElementById("saveFormat")?.value || "png"

    this.showLoading(true)
    this.updateStatus("Saving image...")

    setTimeout(() => {
      const tempCanvas = document.createElement("canvas")
      const tempCtx = tempCanvas.getContext("2d")
      tempCanvas.width = this.canvas.width
      tempCanvas.height = this.canvas.height

      // White background for better compatibility
      tempCtx.fillStyle = "white"
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

      // Save current transform and reset for export
      const currentTransform = this.ctx.getTransform()
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      tempCtx.drawImage(this.canvas, 0, 0)
      this.ctx.setTransform(currentTransform)

      // Create download link
      const link = document.createElement("a")
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      const cleanFileName = fileName.replace(/[^a-z0-9]/gi, "_").toLowerCase()

      link.download = `${cleanFileName}-${timestamp}.${format}`

      // Set appropriate MIME type and quality
      const mimeType = `image/${format}`
      const quality = 0.9

      if (format === "jpeg") {
        link.href = tempCanvas.toDataURL(mimeType, quality)
      } else {
        link.href = tempCanvas.toDataURL(mimeType)
      }

      link.click()

      // Clean up
      modal?.remove()
      this.showLoading(false)
      this.updateStatus(`Image saved as ${link.download}!`)
    }, 100)
  }

  clearCanvasForPreview() {
    if (this.historyStep >= 0) {
      const img = new Image()
      img.onload = () => {
        // Save current transform
        const currentTransform = this.ctx.getTransform()

        // Reset transform for clearing
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // Restore transform and draw image
        this.ctx.setTransform(currentTransform)
        this.ctx.drawImage(img, -this.panX / this.zoom, -this.panY / this.zoom)
      }
      img.src = this.history[this.historyStep]
    }
  }

  // Zoom and pan
  applyTransform() {
    this.ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panX, this.panY)
    this.drawGrid() // Redraw grid with new transform
  }

  zoomIn() {
    const rect = this.canvas.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Calculate zoom center
    const worldX = (centerX - this.panX) / this.zoom
    const worldY = (centerY - this.panY) / this.zoom

    const oldZoom = this.zoom
    this.zoom = Math.min(5, this.zoom * 1.2)

    // Adjust pan to keep center point stable
    this.panX = centerX - worldX * this.zoom
    this.panY = centerY - worldY * this.zoom

    this.applyTransform()
    this.updateZoomDisplay()
    this.updateStatus(`Zoomed in to ${Math.round(this.zoom * 100)}%`)
  }

  zoomOut() {
    const rect = this.canvas.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Calculate zoom center
    const worldX = (centerX - this.panX) / this.zoom
    const worldY = (centerY - this.panY) / this.zoom

    const oldZoom = this.zoom
    this.zoom = Math.max(0.1, this.zoom / 1.2)

    // Adjust pan to keep center point stable
    this.panX = centerX - worldX * this.zoom
    this.panY = centerY - worldY * this.zoom

    this.applyTransform()
    this.updateZoomDisplay()
    this.updateStatus(`Zoomed out to ${Math.round(this.zoom * 100)}%`)
  }

  resetZoom() {
    this.zoom = 1
    this.panX = 0
    this.panY = 0
    this.applyTransform()
    this.updateZoomDisplay()
    this.updateStatus("Zoom reset to 100%")
  }

  updateZoomDisplay() {
    const zoomLevel = document.getElementById("zoomLevel")
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`
    }
  }

  // Grid
  toggleGrid() {
    this.showGrid = !this.showGrid
    this.gridCanvas.classList.toggle("visible", this.showGrid)
    this.drawGrid()
  }

  drawGrid() {
    if (!this.showGrid) return

    this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height)
    this.gridCtx.strokeStyle = "#e2e8f0"
    this.gridCtx.lineWidth = 1

    const gridSize = 20 * this.zoom
    const offsetX = this.panX % gridSize
    const offsetY = this.panY % gridSize

    // Vertical lines
    for (let x = offsetX; x < this.gridCanvas.width; x += gridSize) {
      this.gridCtx.beginPath()
      this.gridCtx.moveTo(x, 0)
      this.gridCtx.lineTo(x, this.gridCanvas.height)
      this.gridCtx.stroke()
    }

    // Horizontal lines
    for (let y = offsetY; y < this.gridCanvas.height; y += gridSize) {
      this.gridCtx.beginPath()
      this.gridCtx.moveTo(0, y)
      this.gridCtx.lineTo(this.gridCanvas.width, y)
      this.gridCtx.stroke()
    }
  }

  // UI helpers
  syncColorInputs(inputs, value) {
    inputs.forEach((id) => {
      const input = document.getElementById(id)
      if (input) input.value = value
    })
  }

  syncSliderInputs(inputs, value) {
    inputs.forEach((id) => {
      const input = document.getElementById(id)
      if (input) input.value = value
    })
  }

  updateColorPreviews() {
    const strokePreview = document.getElementById("strokePreview")
    const fillPreview = document.getElementById("fillPreview")

    if (strokePreview) strokePreview.style.backgroundColor = this.strokeColor
    if (fillPreview) fillPreview.style.backgroundColor = this.fillColor
  }

  updateBrushPreview() {
    const preview = document.getElementById("brushPreviewCircle")
    if (preview) {
      const size = Math.min(40, Math.max(4, this.brushSize))
      preview.style.width = `${size}px`
      preview.style.height = `${size}px`
      preview.style.backgroundColor = this.strokeColor
    }
  }

  updateUI() {
    this.updateColorPreviews()
    this.updateBrushPreview()
    this.updateZoomDisplay()
  }

  updateStatus(message) {
    const status = document.getElementById("canvasStatus")
    if (status) {
      status.textContent = message
      setTimeout(() => {
        if (status.textContent === message) {
          status.textContent = "Ready to draw!"
        }
      }, 3000)
    }
  }

  showLoading(show) {
    const overlay = document.getElementById("loadingOverlay")
    if (overlay) {
      overlay.classList.toggle("visible", show)
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      this.isFullscreen = true
    } else {
      document.exitFullscreen()
      this.isFullscreen = false
    }
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  new AdvancedDrawingApp()
})
