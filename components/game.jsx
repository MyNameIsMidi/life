/**
 * Controls:
 * left click flips a cells state
 * right click highlights a cell
 */

import React, { Component } from 'react';

let canvas;
let ctx;
let frameInterval;

class Game extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cellsize: 30, // width & height of each cell
      cells: [], // array of cells
      cellHistory: [], // Retains cell history for up to 'historyLength' steps
      step: 0, // Current step, 0 is latest. Max 'historyLength'
      historyLength: 1,
      intervalTime: 1000, // frame rate (ms)
      intervalMin: 200,
      intervalMax: 86400000,
      isPlaying: false,
      drawGrid: false,
      underpopulation: 1, // Any live cell with fewer than two live neighbours dies, as if by underpopulation.
      reproductionMin: 2, // Any live cell with two or three live neighbours lives on to the next generation.
      reproductionMax: 3, // Any live cell with two or three live neighbours lives on to the next generation.
      overpopulation: 4, // Any live cell with more than three live neighbours dies, as if by overpopulation.
      deadReproduction: 3, // Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
      selectedStamp: {},
      stamps: [], // Available stamps
    };
    this.createLife = this.createLife.bind(this);
    this.updateCanvasSize = this.updateCanvasSize.bind(this);
    this.updateDrawing = this.updateDrawing.bind(this);
    this.drawCell = this.drawCell.bind(this);
    this.drawLoop = this.drawLoop.bind(this);
    this.highlightCell = this.highlightCell.bind(this);
    this.canvasClicked = this.canvasClicked.bind(this);
    this.flipCellState = this.flipCellState.bind(this);
    this.printCellInfo = this.printCellInfo.bind(this);
    this.setPlaying = this.setPlaying.bind(this);
    this.getNeighbours = this.getNeighbours.bind(this);
    this.clearCells = this.clearCells.bind(this);
    this.setFramerate = this.setFramerate.bind(this);
    this.stamp = this.stamp.bind(this);
    this.setStamp = this.setStamp.bind(this);
    this.addStamp = this.addStamp.bind(this);
    this.canvasRightClicked = this.canvasRightClicked.bind(this);
    this.setHistoryLength = this.setHistoryLength.bind(this);
    this.reverseStep = this.reverseStep.bind(this);
    this.forwardStep = this.forwardStep.bind(this);
  }

  componentDidMount() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    if (canvas && canvas.getContext) {
      window.addEventListener('resize', this.updateCanvasSize);
      this.updateCanvasSize();
      this.createLife();
    } else {
      // not supported!
      console.log('Failed to make life');
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateCanvasSize);
    clearInterval(frameInterval);
  }

  setPlaying(event, playing) {
    let gameRunning = playing;
    if (gameRunning === undefined) {
      const { isPlaying } = this.state;
      gameRunning = !isPlaying;
    }
    this.setState({ isPlaying: gameRunning }, () => {
      if (gameRunning) {
        const { intervalTime } = this.state;
        frameInterval = setInterval(() => {
          this.drawLoop();
        }, intervalTime);
      } else {
        frameInterval = clearInterval(frameInterval);
      }
    });
  }

  /**
     * How many alive neighbours are there to the given cell
     * out of 8 possible cells
     * @param {object} cell
     */
  getNeighbours(cell) {
    const { cells } = this.state;
    let neighbours = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        if (
          cells[cell.y + y] !== undefined
          && cells[cell.y + y][cell.x + x] !== undefined
          && ((cells[cell.y + y][cell.x + x].isAlive
          && !cells[cell.y + y][cell.x + x].needsUpdate)
          || (!cells[cell.y + y][cell.x + x].isAlive
          && cells[cell.y + y][cell.x + x].needsUpdate)
          )) {
          if (!(x === 0 && y === 0)) {
            neighbours += 1;
          }
        }
      }
    }
    return neighbours;
  }

  setHistoryLength(event) {
    try {
      const historyLength = parseInt(event.target.value, 10);
      if (historyLength > 0) {
        this.setState({ historyLength });
      }
    } catch (error) {
      console.log(error);
    }
  }

  setFramerate(event) {
    try {
      const { intervalMax, intervalMin, isPlaying } = this.state;
      const rate = parseInt(event.target.value, 10);
      if (rate <= intervalMax && rate >= intervalMin) {
        console.log('Frame rate:', rate);
        this.setState({ intervalTime: rate }, () => {
          clearInterval(frameInterval);
          if (isPlaying) {
            this.setPlaying({}, true);
          }
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  setStamp(event) {
    const { stamps } = this.state;
    const stampName = event.target.value;
    const stamp = stamps.find((stmp) => stmp.name === stampName);
    if (stamp !== undefined) {
      this.setState({ selectedStamp: stamp });
    }
  }

  stamp() {
    // Let user place a stamp
    const { selectedStamp } = this.state;
    console.log(selectedStamp);
  }

  addStamp() {
    // Highlight cells and add to stamp collection
    const { highlighting } = this.state;
    const isHighlighting = highlighting;
    this.setState({ highlighting: isHighlighting });
  }

  flipCellState(x, y) {
    const { cells } = this.state;
    if (cells.length > y && cells[y].length > x) {
      // const cellX = Math.floor(x / this.state.cellsize);
      // const cellY = Math.floor(y / this.state.cellsize);
      cells[y][x].isAlive = !cells[y][x].isAlive;
      this.setState({ cells }, () => {
        this.drawCell(x, y, cells[y][x].isAlive);
        this.printCellInfo(x, y);
      });
    }
  }

  updateCanvasSize() {
    const { cellsize } = this.state;
    const gameContainer = document.getElementById('game');
    const cWidth = gameContainer.clientWidth
    - (gameContainer.clientWidth % cellsize);
    const cHeight = gameContainer.clientHeight
    - (gameContainer.clientHeight % cellsize);
    canvas.width = cWidth;
    canvas.height = cHeight;

    this.updateDrawing();
  }

  updateDrawing() {
    const { drawGrid } = this.state;
    if (drawGrid) {
      this.drawGrid();
    }
    this.drawLoop();
  }

  /**
     * Draws a cell from a given x & y co-ordinate
     * @param {int} cellPosX - Cell position in the grid on the x-axis
     * @param {int} cellPosY - Cell position in the grid on the y-axis
     * @param {bool} isAlive - is the cell alive or dead?
     */
  drawCell(cellPosX, cellPosY, isAlive) {
    const { cellsize } = this.state;
    const cellX = cellPosX * cellsize;
    const cellY = cellPosY * cellsize;
    ctx.beginPath();
    if (isAlive) {
      // Fill cell
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(cellX, cellY, cellsize, cellsize);
    } else {
      // Empty cell
      // ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.clearRect(cellX, cellY, cellsize, cellsize);
      // ctx.fillRect(cellX, cellY, this.state.cellsize, this.state.cellsize);
    }
    ctx.closePath();
  }

  clearCells() {
    this.setPlaying({}, false);
    ctx.clearRect(0, 0, canvas.clientHeight, canvas.clientWidth);
    this.createLife();
  }

  highlightCell(x, y, unhighlight) {
    const { cellsize, cells } = this.state;
    let setUnhighlighted = unhighlight;
    if (setUnhighlighted === undefined) {
      setUnhighlighted = false;
    }
    const cellX = x * cellsize;
    const cellY = y * cellsize;
    if (!unhighlight) {
      ctx.fillStyle = 'rgba(212,47,47,0.5)';
      ctx.fillRect(cellX, cellY, cellsize, cellsize);
    } else {
      this.drawCell(x, y, cells[y][x].isAlive);
    }
  }

  /**
     * Sets cell to selected.
     * Returns new cell selected status.
     * Returns null if no cell found
     * @param {int} x cell x pos
     * @param {int} y cell y pos
     */
  selectCell(x, y) {
    const { cells } = this.state;
    if (cells[y] !== undefined && cells[y][x] !== undefined) {
      const cell = cells[y][x];
      cell.selected = !cell.selected;
      this.setState({ cells });
      return cell.selected;
    }
    return null;
  }

  deselectCells() {
    const { cells } = this.state;
    cells.forEach((cellY) => {
      cellY.forEach((cellX) => {
        const cell = cellX;
        cell.selected = false;
      });
    });
    this.setState({ cells });
  }

  canvasClicked(e) {
    const { cellsize } = this.state;

    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    // console.log(`x: ${x} / y: ${y}`, e);

    x = Math.floor(x / cellsize);
    y = Math.floor(y / cellsize);

    this.flipCellState(x, y);

    const { cells } = this.state;
    if (cells[y] !== undefined && cells[y][x] !== undefined) {
      // Retain highlight if highlighted
      const cell = cells[y][x];
      if (cell.selected) {
        this.highlightCell(x, y);
      }
    }
  }

  canvasRightClicked(e) {
    e.preventDefault(); // Block context menu
    const { cellsize } = this.state;
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    x = Math.floor(x / cellsize);
    y = Math.floor(y / cellsize);
    console.log(`x: ${x} / y: ${y}`, e);
    const selected = this.selectCell(x, y);
    this.highlightCell(x, y, !selected);
  }

  printCellInfo(x, y) {
    const { cells } = this.state;
    console.log(cells[y][x]);
  }

  drawGrid() {
    const { cellsize } = this.state;
    for (let i = 0; i < canvas.height / cellsize; i++) {
      const yPos = cellsize * i;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(canvas.width, yPos);
      ctx.closePath();
      ctx.stroke();
    }

    for (let i = 0; i < canvas.width / cellsize; i++) {
      const xPos = cellsize * i;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, canvas.height);
      ctx.closePath();
      ctx.stroke();
    }
  }

  drawLoop() {
    const {
      cells,
      cellHistory,
      overpopulation,
      underpopulation,
      deadReproduction,
      historyLength,
      step,
    } = this.state;
    cells.forEach((cellsY) => {
      cellsY.forEach((cellX) => {
        const cell = cellX;
        cell.needsUpdate = false;
        // Get cell neighbours
        const neighbours = this.getNeighbours(cell);
        if (cell.isAlive) {
          // Death conditions
          if (neighbours >= overpopulation || neighbours <= underpopulation) {
            // Cell dies
            cell.needsUpdate = true;
            cell.isAlive = false;
          } // else if (neighbours >= this.state.reproductionMin && neighbours <= this.state.reproductionMax) {
          // Cell lives on
          // cell.isAlive = true;
          // }
        } else if (neighbours === deadReproduction) {
          // Cell is dead
          cell.needsUpdate = true;
          cell.isAlive = true;
        }
      });
    });
    cells.forEach((cellsY) => {
      cellsY.forEach((cellX) => {
        const cell = cellX;
        // Draw cells
        if (cell.needsUpdate) {
          cell.needsUpdate = false;
          this.drawCell(cell.x, cell.y, cell.isAlive);
        }
      });
    });
    if (historyLength > 1 && step === 0) {
      cellHistory.push(cells);
      if (cellHistory.length > historyLength) {
        const removeLength = cellHistory.length - historyLength;
        cellHistory.splice(historyLength, removeLength);
      }
    }
    this.setState({ cells, cellHistory });
  }

  createLife() {
    const { cellsize } = this.state;
    // On the first day
    const cells = [];
    for (let j = 0; j < canvas.height / cellsize; j++) {
      cells.push([]);
      for (let i = 0; i < canvas.width / cellsize; i++) {
        cells[j].push({
          id: `${j}-${i}`, isAlive: false, x: i, y: j, needsUpdate: false,
        });
      }
    }
    this.setState({ cells }, () => {
      console.log(cells);
    });
  }

  forwardStep() {
    const { step, cellHistory } = this.state;
    if (step !== 0
        && step - 1 < cellHistory.length
    ) {
      this.setPlaying({}, false);
      const nextStep = step - 1;
      const cells = JSON.parse(JSON.stringify(cellHistory[step]));
      this.setState({ step: nextStep, cells }, () => {
        this.drawLoop();
      });
    }
  }

  reverseStep() {
    const { step, cellHistory } = this.state;
    if (step + 1 < cellHistory.length - 1) {
      this.setPlaying({}, false);
      const nextStep = step + 1;
      const cells = JSON.parse(JSON.stringify(cellHistory[step - 1]));
      this.setState({ step: nextStep, cells }, () => {
        console.log(`step - ${step}`, cellHistory);
        this.drawLoop();
      });
    }
  }

  render() {
    const {
      stamps,
      isPlaying,
      intervalTime,
      selectedStamp,
      historyLength,
    } = this.state;
    const stampbook = stamps.map((stamp) => (
      <option
        key={`stamp-${stamp.name}`}
        value={stamp.name}
      >
        {stamp.name}
      </option>
    ));
    return (
      <div id="game">
        <canvas
          id="gameCanvas"
          onClick={this.canvasClicked}
          onContextMenu={this.canvasRightClicked}
        >
          {'Sorry, but your browser does not support <canvas>'}
        </canvas>
        <div id="controlBar">
          <button
            className="play-btn"
            type="button"
            onClick={this.setPlaying}
            onKeyPress={this.setPlaying}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            className="clear-btn"
            type="button"
            onClick={this.clearCells}
            onKeyPress={this.clearCells}
          >
            Clear
          </button>
          <input
            type="number"
            min={200}
            max={60000}
            value={intervalTime}
            onChange={this.setFramerate}
          />
          <select
            id="stampSelect"
            value={selectedStamp}
            onChange={this.setStamp}
          >
            {stampbook}
          </select>
          <button
            className="stamp-btn"
            type="button"
            onClick={this.stamp}
            onKeyPress={this.stamp}
          >
            Add prefab
          </button>
          <button
            className="add-stamp-btn"
            type="button"
            onClick={this.addStamp}
            onKeyPress={this.addStamp}
          >
            Create prefab
          </button>
          <input
            type="number"
            min={1}
            max={1000}
            value={historyLength}
            onChange={this.setHistoryLength}
          />
          <button
            className="step-btn reverse"
            type="button"
            onClick={this.reverseStep}
            onKeyPress={this.reverseStep}
          >
            Back
          </button>
          <button
            className="step-btn forward"
            type="button"
            onClick={this.forwardStep}
            onKeyPress={this.forwardStep}
          >
            Forward
          </button>
        </div>
      </div>
    );
  }
}

export default Game;
