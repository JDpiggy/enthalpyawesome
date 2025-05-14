body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #2c3e50; /* Darker, more modern background */
    margin: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* Nicer font stack */
    color: white;
    overflow: hidden;
}

.game-container {
    position: relative;
    border: 3px solid #34495e; /* Slightly thicker border */
    box-shadow: 0 0 25px rgba(0,0,0,0.6); /* More pronounced shadow */
    border-radius: 5px; /* Slight rounding for the container */
}

canvas {
    display: block;
    background-color: #87CEEB; /* Sky blue, can adjust */
}

#ui-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
}

#score, #highScore {
    position: absolute;
    font-size: 28px; /* << INCREASED font size */
    padding: 15px;   /* << INCREASED padding */
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5); /* Softer shadow */
}

#score {
    top: 15px;
    left: 15px;
}

#highScore {
    top: 15px;
    right: 15px;
}

#fuelBarContainer {
    position: absolute;
    bottom: 15px;
    left: 15px;
    font-size: 20px; /* << INCREASED font size */
    background-color: rgba(0,0,0,0.4);
    padding: 10px; /* << INCREASED padding */
    border-radius: 8px;
}

#fuelBar {
    width: 180px; /* << INCREASED width */
    height: 20px; /* << INCREASED height */
    background-color: #f39c12; /* Brighter orange */
    border: 1px solid #1a1a1a;
    border-radius: 5px; /* More rounding */
    margin-top: 5px;
    transition: width 0.2s ease-out;
}


#startScreen, #gameOverScreen {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(44, 62, 80, 0.85); /* Match body bg, with transparency */
    padding: 40px; /* << INCREASED padding */
    border-radius: 15px; /* More rounded */
    text-align: center;
    pointer-events: all;
    box-shadow: 0 5px 20px rgba(0,0,0,0.4);
    min-width: 380px; /* Ensure it's wide enough */
    max-width: 70%;   /* Don't let it get too wide */
}

#startScreen h1, #gameOverScreen h2 {
    margin-top: 0;
    margin-bottom: 25px; /* More space */
    color: #e67e22; /* Different accent color */
    font-size: 36px; /* << INCREASED font size */
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

#startScreen p, #gameOverScreen p {
    margin-bottom: 25px;
    font-size: 18px; /* << INCREASED font size */
    line-height: 1.6;
}

#startScreen button, #gameOverScreen button, #toggleSoundButton {
    padding: 14px 28px; /* << INCREASED padding */
    font-size: 18px;    /* << INCREASED font size */
    background-color: #2ecc71; /* Greener */
    color: white;
    border: none;
    border-radius: 8px; /* More rounded */
    cursor: pointer;
    margin: 10px 5px; /* Adjust margin */
    transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
    pointer-events: all;
    text-transform: uppercase;
    font-weight: bold;
    letter-spacing: 1px;
    box-shadow: 0 3px 7px rgba(0,0,0,0.25); /* Nicer shadow */
}

#toggleSoundButton {
    position: absolute;
    bottom: 20px; /* Adjust if needed */
    right: 20px;  /* Adjust if needed */
    background-color: #3498db; /* Bluer */
    font-size: 14px;
    padding: 10px 18px; /* Adjusted padding */
}

#startScreen button:hover, #gameOverScreen button:hover {
    background-color: #27ae60; /* Darker green on hover */
    transform: translateY(-2px);
    box-shadow: 0 5px 10px rgba(0,0,0,0.35);
}
#toggleSoundButton:hover {
    background-color: #2980b9; /* Darker blue on hover */
    transform: translateY(-2px);
    box-shadow: 0 5px 10px rgba(0,0,0,0.3);
}

#startScreen button:active, #gameOverScreen button:active, #toggleSoundButton:active {
    transform: translateY(0px);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}


#gameOverScreen p:nth-of-type(2) {
    color: #f1c40f; /* Brighter yellow */
    font-weight: bold;
    font-size: 20px; /* Larger for emphasis */
    display: none;
}
