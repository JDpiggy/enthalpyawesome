let resources = {
  wood: 100,
  stone: 100,
  food: 100,
  gold: 100
};

function updateUI() {
  for (let key in resources) {
    document.getElementById(key).textContent = resources[key];
  }
}

function upgradeBuilding(type) {
  if (resources.wood >= 50 && resources.stone >= 50) {
    resources.wood -= 50;
    resources.stone -= 50;
    resources.gold += 20;
    alert(`${type} upgraded!`);
  } else {
    alert("Not enough resources!");
  }
  updateUI();
}

function trainUnit(type) {
  if (resources.food >= 30 && resources.gold >= 20) {
    resources.food -= 30;
    resources.gold -= 20;
    alert(`${type} trained!`);
  } else {
    alert("Not enough resources!");
  }
  updateUI();
}

function triggerEvent() {
  const events = ["A plague reduces food!", "Raiders steal wood!", "You found gold!", "New settlers arrive!"];
  const choice = events[Math.floor(Math.random() * events.length)];
  alert(choice);
  // Simple example of impact
  if (choice.includes("food")) resources.food -= 20;
  if (choice.includes("wood")) resources.wood -= 20;
  if (choice.includes("gold")) resources.gold += 50;
  if (choice.includes("settlers")) resources.food += 30;
  updateUI();
}

updateUI();
