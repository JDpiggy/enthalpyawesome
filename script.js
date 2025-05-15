/* ... (your existing CSS) ... */

/* Character Slot Styling within the Shop */
#shopPanelLeft .character-slot {
    background-color: rgba(255,255,255,0.08);
    border: 2px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    padding: 10px; /* Adjusted padding */
    display: flex;
    align-items: center;
    gap: 10px; /* Adjusted gap */
    transition: background-color 0.2s ease, border-color 0.2s ease;
    cursor: pointer;
}

#shopPanelLeft .character-slot:hover {
    background-color: rgba(255,255,255,0.15);
    border-color: rgba(255,255,255,0.4);
}

#shopPanelLeft .character-slot.selected-in-shop {
    border-color: #55efc4;
    background-color: rgba(85, 239, 196, 0.15);
}

#shopPanelLeft .character-slot img {
    width: 60px; /* Slightly smaller if needed */
    height: 60px;
    object-fit: contain;
    background-color: rgba(0,0,0,0.2);
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0; /* Prevent image from shrinking */
}
#shopPanelLeft .character-slot img.not-ready {
    background-color: #333;
}

.char-info-shop {
    flex-grow: 1; /* Allow info to take up available space */
    text-align: left;
    min-width: 0; /* Important for flex items containing text that might overflow */
}

#shopPanelLeft .character-slot .char-name {
    font-size: 16px; /* Adjusted font size */
    font-weight: bold;
    color: #fff;
    margin-bottom: 3px; /* Adjusted margin */
    white-space: nowrap; /* Prevent name from wrapping if too long, or use overflow */
    overflow: hidden;
    text-overflow: ellipsis;
}

#shopPanelLeft .character-slot .char-price,
#shopPanelLeft .character-slot .char-status {
    font-size: 13px; /* Adjusted font size */
    color: #feca57;
    margin-bottom: 5px; /* Adjusted margin */
}
#shopPanelLeft .character-slot .char-status {
    color: #55efc4;
}

/* NEW class for the button container */
.shop-button-container {
    margin-left: auto; /* Pushes button to the right */
    flex-shrink: 0; /* Prevent button container from shrinking */
}

#shopPanelLeft .character-slot button {
    padding: 7px 12px; /* Adjusted padding */
    font-size: 13px; /* Adjusted font size */
    /* margin-left: auto; Removed from here, handled by container */
    background-image: linear-gradient(to bottom, #74b9ff, #0984e3);
    color: white;
    border:none;
    border-radius: 6px;
    white-space: nowrap; /* Prevent button text from wrapping */
}
#shopPanelLeft .character-slot button:disabled {
    background-image: linear-gradient(to bottom, #999, #777);
    cursor: not-allowed;
    opacity: 0.7;
}


/* ... (rest of your CSS) ... */
