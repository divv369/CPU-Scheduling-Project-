document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("simulator").style.display = "none";
});


function createInputs() {
  let n = document.getElementById("numProcesses").value;
  let container = document.getElementById("processInputs");

  container.innerHTML = "";

  for (let i = 0; i < n; i++) {
    container.innerHTML += `
      <p>
        P${i + 1} Arrival Time:
        <input type="number" id="at${i}">
        Burst Time:
        <input type="number" id="bt${i}">
      </p>
    `;
  }
}


let n = document.getElementById("numProcesses").value;

let container = document.getElementById("processInputs");

function getProcesses() {
  let n = document.getElementById("numProcesses").value;
  let processes = [];

  for (let i = 0; i < n; i++) {
    let arrival = document.getElementById("at" + i).value;
    let burst = document.getElementById("bt" + i).value;

    let process = {
      pid: i + 1,
      arrivalTime: Number(arrival),
      burstTime: Number(burst),
      remainingTime: Number(burst)
    };

    processes.push(process);
  }

  return processes;
}

//run button ko fcfs se connect kar rahe 
function runScheduling() {
 

  document.getElementById("gantt").innerHTML = "";
document.getElementById("output").innerHTML = "";

 let processes = getProcesses();
  let algo = document.getElementById("algorithm").value;

  let result;
  if (algo === "fcfs") result = fcfs(processes);
  else if (algo === "sjf") result = sjf(processes);
  else if (algo === "srtf") result = srtf(processes);
  else if (algo === "rr") {
  let q = Number(document.getElementById("quantum").value);
  result = roundRobin(processes, q);
}


drawGanttChart(result.gantt);



  // --- DETAILS ---
  let output = `
<table border="1" cellpadding="6">
 <tr>
  <th>Process</th>
  <th>Arrival Time</th>
  <th>Burst Time</th>
  <th>Completion Time</th>
  <th>Waiting Time</th>
  <th>Turnaround Time</th>
</tr>`;

let totalWT = 0;
let totalTAT = 0;

for (let p of result.processes) {
  output += `
 <tr>
  <td>P${p.pid}</td>
  <td>${p.arrivalTime}</td>
  <td>${p.burstTime}</td>
  <td>${p.completionTime}</td>
  <td>${p.waitingTime}</td>
  <td>${p.turnaroundTime}</td>
</tr>
  `;
  totalWT += p.waitingTime;
  totalTAT += p.turnaroundTime;
}

output += `
</table>
<br>
<b>Average Waiting Time:</b> ${(totalWT / result.processes.length).toFixed(2)}<br>
<b>Average Turnaround Time:</b> ${(totalTAT / result.processes.length).toFixed(2)}
`;

document.getElementById("output").innerHTML = output;

}


// fcfs kese work karegi
function fcfs(processes) {
  processes.sort((a, b) => a.arrivalTime - b.arrivalTime);

  let time = 0;
  let gantt = [];

  for (let p of processes) {
    if (time < p.arrivalTime) {
      time = p.arrivalTime;
    }

    let start = time;
    time += p.burstTime;
    p.completionTime = time;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
// har processe ke liye values store hogi ismai .
    gantt.push({
      pid: p.pid,
      start: start,
      end: time
    });
  }

  return { processes, gantt };
}


//sjf 
function sjf(processes) {
  let time = 0;
  let completed = 0;
  let n = processes.length;
  let gantt = [];

  // initialize
  for (let p of processes) p.done = false;

  while (completed < n) {

    // ready queue: arrived & not done
    let ready = processes.filter(p => p.arrivalTime <= time && !p.done);

    // CPU idle
    if (ready.length === 0) {
      time++;
      continue;
    }

    // pick shortest job
    ready.sort((a, b) => a.burstTime - b.burstTime);
    let p = ready[0];

    let start = time;
    time += p.burstTime;

    p.completionTime = time;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    p.done = true;
    completed++;

    gantt.push({ pid: p.pid, start, end: time });
  }

  return { processes, gantt };
}

function srtf(processes) {
  let time = 0;
  let completed = 0;
  let n = processes.length;
  let gantt = [];

  // initialize remaining time
  for (let p of processes) {
    p.remainingTime = p.burstTime;
    p.done = false;
  }

  let currentPid = null;
  let startTime = 0;

  while (completed < n) {

    // ready queue (arrived & not finished)
    let ready = processes.filter(
      p => p.arrivalTime <= time && p.remainingTime > 0
    );

    // CPU idle
    if (ready.length === 0) {
      time++;
      continue;
    }

    // pick process with minimum remaining time
    ready.sort((a, b) => a.remainingTime - b.remainingTime);
    let p = ready[0];

    // context switch detection
    if (currentPid !== p.pid) {
      if (currentPid !== null) {
        gantt[gantt.length - 1].end = time;
      }
      gantt.push({ pid: p.pid, start: time, end: null });
      currentPid = p.pid;
    }

    // execute for 1 time unit
    p.remainingTime--;
    time++;

    // process completed
    if (p.remainingTime === 0) {
      p.completionTime = time;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      completed++;
    }
  }

  // close last gantt entry
  gantt[gantt.length - 1].end = time;

  return { processes, gantt };
}

function roundRobin(processes, quantum) {
  let time = 0;
  let n = processes.length;
  let completed = 0;
  let gantt = [];
  let queue = [];

  // init
  for (let p of processes) {
    p.remainingTime = p.burstTime;
    p.done = false;
  }

  // sort by arrival time
  processes.sort((a, b) => a.arrivalTime - b.arrivalTime);

  let i = 0; // index for arriving processes

  while (completed < n) {

    // add newly arrived processes to queue
    while (i < n && processes[i].arrivalTime <= time) {
      queue.push(processes[i]);
      i++;
    }

    // CPU idle
    if (queue.length === 0) {
      time++;
      continue;
    }

    let p = queue.shift(); // dequeue
    let exec = Math.min(quantum, p.remainingTime);

    // gantt entry
    gantt.push({ pid: p.pid, start: time, end: time + exec });

    // execute
    time += exec;
    p.remainingTime -= exec;

    // add processes that arrived during execution
    while (i < n && processes[i].arrivalTime <= time) {
      queue.push(processes[i]);
      i++;
    }

    // if finished
    if (p.remainingTime === 0) {
      p.completionTime = time;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      completed++;
    } else {
      queue.push(p); // requeue
    }
  }

  return { processes, gantt };
}

function selectAlgorithm(algo) {
  document.getElementById("landing").style.display = "none";
  document.getElementById("simulator").style.display = "block";

  // algorithm dropdown ko auto-set karo
  document.getElementById("algorithm").value = algo;
}

// Google Charts load (ye sirf ek baar rehna chahiye)
google.charts.load("current", { packages: ["timeline"] });

function drawGanttChart(ganttData) {

  google.charts.setOnLoadCallback(function () {

    let container = document.getElementById("gantt");
    container.innerHTML = "";

    let chart = new google.visualization.Timeline(container);
    let dataTable = new google.visualization.DataTable();

    // IMPORTANT: Timeline needs DATE type
    dataTable.addColumn({ type: "string", id: "Process" });
    dataTable.addColumn({ type: "string", id: "Label" });
    dataTable.addColumn({ type: "string", role: "style" });
    dataTable.addColumn({ type: "date", id: "Start" });
    dataTable.addColumn({ type: "date", id: "End" });

    const colors = {
      1: "#2563eb", // blue
      2: "#16a34a", // green
      3: "#dc2626", // red
      4: "#9333ea", // purple
      5: "#ea580c"  // orange
    };

    ganttData.forEach(g => {
      dataTable.addRow([
        "P" + g.pid,
        "P" + g.pid,
        `color: ${colors[g.pid] || "#6b7280"}`,
        new Date(0, 0, 0, 0, 0, g.start),
        new Date(0, 0, 0, 0, 0, g.end)
      ]);
    });

    let options = {
      timeline: {
        rowHeight: 45,
        barLabelStyle: { fontSize: 12 },
        rowLabelStyle: { fontSize: 14 }
      }
    };

    chart.draw(dataTable, options);
  });
}
 