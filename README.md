# ⚛️ QuantumTick

## 📖 About

**QuantumTick** is a CPU scheduling algorithm simulator built in Java as a laboratory requirement for CMSC 125 (Operating Systems). It brings the abstract world of CPU scheduling to life through an interactive, visual interface — letting users see exactly how processes compete for processor time, tick by tick.

The project simulates core scheduling algorithms studied in operating systems, providing real-time visual feedback through an animated Gantt chart, a running execution timer, and a detailed metrics table.

The project features:
* **6 Scheduling Algorithms:** Simulate and compare FCFS, Round Robin, SJF (Preemptive & Non-Preemptive), and Priority Scheduling (Preemptive & Non-Preemptive).
* **Animated Gantt Chart:** Watch processes execute in real time, color-coded per process, driven by a running timer that ticks as arrival times are matched.
* **Three Input Modes:** Feed the scheduler via random generation, manual user input, or a text file — your choice.
* **Performance Metrics Table:** Instantly see per-process and average waiting time and turnaround time after each run.
* **Maven-Powered Build:** Clean, reproducible builds with a bundled Maven Wrapper — no prior Maven installation required.

---

## 🎮 How to Use

### 1. Input Your Processes
When the simulator launches, choose how to provide process data:

| Mode | Description |
|---|---|
| **Random** | The simulator auto-generates process data (IDs, burst times, arrival times, priorities). |
| **Manual Input** | Enter each process's data directly through the on-screen input panel. |
| **Text File** | Load process data from a `.csv` file formatted to the simulator's specification. |

**Valid input ranges:**
* Number of processes: **3 – 20**
* Burst time per process: **1 – 30**
* Arrival time per process: **0 – 30**
* Priority number: **1 – 20** (no duplicates)
* Time quantum (Round Robin only): **1 – 10**

### 2. Choose a Scheduling Algorithm
After entering your process data, select one of the six available algorithms:

* **First Come First Serve (FCFS)**
* **Round Robin** *(requires a time quantum input)*
* **Shortest Job First — Preemptive**
* **Shortest Job First — Non-Preemptive**
* **Priority — Preemptive** *(requires specifying whether higher number = higher or lower priority)*
* **Priority — Non-Preemptive** *(same priority convention choice)*

### 3. Run the Simulation
Click **Run** (mouse-driven throughout) and watch the animated Gantt chart execute in real time. The timer ticks forward, and processes are dispatched and color-coded as their arrival times are reached.

### 4. Review the Results
Once the simulation completes, the metrics table populates with per-process and average waiting time and turnaround time:

| Process ID | Burst Time | Arrival Time | Priority | Waiting Time | Turnaround Time | Avg. Waiting Time | Avg. Turnaround Time |
|---|---|---|---|---|---|---|---|

### 5. Reset and Compare
Clear the simulation and try a different algorithm or input set to compare scheduling behavior side by side.

---

## ⚙️ How to Build and Run

### Prerequisites
* **Java 11+** must be installed on your machine.
* **Maven** is *not* required — see Option A below.

---

### Option A: Using the Maven Wrapper *(Recommended)*
No Maven installation needed. The wrapper downloads everything automatically.

1. Clone this repository:
   ```bash
   git clone https://github.com/g1-cmsc125/QuantumTick.git
   cd QuantumTick/quantum-tick
   ```
2. Run the build command using the wrapper:
   * **Windows:**
     ```cmd
     .\mvnw.cmd clean package
     ```
   * **Mac/Linux:**
     ```bash
     ./mvnw clean package
     ```
3. Find the compiled `.jar` (and `.exe` on Windows) in the `/target` directory.

---

### Option B: Using Maven Directly
If you already have Maven installed:

1. Open a terminal in the `quantum-tick` project root (where `pom.xml` is located).
2. Run:
   ```bash
   mvn clean package
   ```
3. Check the `/target` folder for the built artifacts.

---

### Option C: Running the JAR
After building, launch the application directly:

```bash
java -jar target/QuantumTick.jar
```

Then open your browser and navigate to the address shown in the terminal output (e.g., `http://localhost:8080`).

---

## 📂 Project Structure

This project follows the standard **Maven directory layout**.

```
QuantumTick/
├── quantum-tick/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/group1/      ← Java source code (feature packages)
│   │   │   └── resources/com/group1/ ← Static assets, configs (bundled into JAR)
│   │   └── test/
│   │       ├── java/com/group1/      ← JUnit/TestNG test files
│   │       └── resources/com/group1/ ← Test-only assets
│   ├── target/                       ← Build output (auto-generated, do not commit)
│   └── pom.xml                       ← Maven project configuration
└── README.md
```

> ⚠️ Do **not** commit the `target/` directory. It is auto-generated on every build.

---

## 📦 Package Conventions

Base package: **`com.group1`**

We organize **by feature**, not by layer. Keep related classes together:

| ✅ DO | ❌ DON'T |
|---|---|
| `com.group1.scheduler` (contains `Scheduler.java`, `SchedulerService.java`, `Process.java`) | `com.group1.models`, `com.group1.services` (scatters related code) |

---

## 👨‍💻 The Developers

This project was developed by Group 1 for CMSC 125:

* Angela Almazan
* Mac Alvarico
* Desirre Barbosa
* Zsyvette Bugho