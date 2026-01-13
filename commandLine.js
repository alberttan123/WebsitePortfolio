//object stores single source of truth - fetch once only
let dataStore = {
    PersonalInformation:{},
    WorkExperience:{},
    CtfExperience:{},
    Education:{},
    Certificates:{},
    Projects:{}
};

let state = {
    currentDirectory: "∼",
    fontColor: "white",
    commandHistoryPosition: -1
}

let linking = {
    WorkExperience: "Role",
    CtfExperience: "CTF Name",
    Education: "Qualification",
    Certificates: "Certificate Name",
    Projects: "Project Title"
}

let commandHistory = []; //for arrow key history

async function loadData(){
    try{
        url = "http://localhost:8000/data.json";
        const response = await fetch(url);

        if(!response.ok){
            throw new Error(`Unable to fetch data. Status: ${response.status}`);
        }

        const fetchedData = await response.json();
        if(response.ok){
            if(fetchedData.PersonalInformation != null){
                dataStore.PersonalInformation = fetchedData.PersonalInformation;
            }

            if(fetchedData.WorkExperience != null){
                dataStore.WorkExperience = fetchedData.WorkExperience;
            }

            if(fetchedData.CTFExperience != null){
                dataStore.CtfExperience = fetchedData.CTFExperience;
            }

            if(fetchedData.Education != null){
                dataStore.Education = fetchedData.Education;
            }

            if(fetchedData.Certificates != null){
                dataStore.Certificates = fetchedData.Certificates;
            }

            if(fetchedData.Projects != null){
                dataStore.Projects = fetchedData.Projects;
            }
        }
        console.log(dataStore);
    }
    catch (error){
        console.error(error.message);
        printWithoutPrompt(error.message, "error");
    }
}

function processInput(input){
    pushToCommandHistory(input);
    let functionlist = ["clear", "ls", "cd", "cat", "help", ""]
    switch(true){
        case (input === "help"):
            printHelpMessage();
            break;
        case (input === "ls"):
            printDirectory(state.currentDirectory);
            break;
        case (input === "clear"):
            clearCommandHistory();
            break;
        case (/^cd\b/gm.test(input)):{ //checks if input starts with cd
            let split = input.split(' ');
            let splitLength = split.length;
            let locationTo = split[1];

            if(splitLength > 2){
                let count = 0;
                while(count<splitLength){
                    if(count == 0){
                        locationTo = "";
                    }
                    if(count == 1){
                        locationTo = locationTo.concat(split[count]);
                    }
                    if(count > 1){
                        locationTo = locationTo.concat(" ", split[count]);
                    }
                    count++;
                }
            }
            
            if(locationTo == null || locationTo == ""){
                //change directory back to home
                state.currentDirectory = "∼";
                updateUserPrompt();
                break;
            }

            if(locationTo == "../" || locationTo == ".."){
                if(state.currentDirectory == "∼"){
                    //handling when in home directory
                    break;
                }

                //remove last one
                let parentDir = state.currentDirectory.split('/');
                parentDir.pop();
                
                //rebuild
                let newDir = "";
                parentDir.forEach((item) => {
                    if(newDir == ""){
                        newDir = newDir.concat(item); //tilda handling
                    }else{
                        newDir = newDir.concat('/', item);
                    }
                })

                state.currentDirectory = newDir;
                updateUserPrompt();
                break;
            }

            let isFoundInCurrDir = testFoundInCurrentDirectory(locationTo);
            if(!isFoundInCurrDir){
                errorMessage = `cd: no such file or directory: ${locationTo}`;
                printWithoutPrompt(errorMessage, "error");
                break;
            }

            let isFile = testIsFile(locationTo);
            if(isFile){
                errorMessage = `cd: ${locationTo}: Not a directory`;
                printWithoutPrompt(errorMessage, "error");
                break;
            }

            state.currentDirectory = state.currentDirectory.concat('/', locationTo);
            updateUserPrompt();
            break;}
        case (/^cat\b/gm.test(input)):{ //checks if input starts with cat
            let split = input.split(' ');
            let splitLength = split.length;
            let fileToRead = split[1];

            if(splitLength > 2){
                let count = 0;
                while(count<splitLength){
                    if(count == 0){
                        fileToRead = "";
                    }
                    if(count == 1){
                        fileToRead = fileToRead.concat(split[count]);
                    }
                    if(count > 1){
                        fileToRead = fileToRead.concat(" ", split[count]);
                    }
                    count++;
                }
            }

            let isFoundInCurrDir = testFoundInCurrentDirectory(fileToRead);
            if(!isFoundInCurrDir){
                errorMessage = `cat: no such file or directory: ${fileToRead}`;
                printWithoutPrompt(errorMessage, "error");
                break;
            }

            let isFile = testIsFile(fileToRead);
            if(isFile){
                //print contents of file
                printFile(fileToRead);
            }else{
                //show error message
                errorMessage = `cat: ${fileToRead}: Is a directory`;
                printWithoutPrompt(errorMessage, "error");
            }
            break;}
        case (!functionlist.includes(input)):
            errorMessage = input + ": command not found";
            printWithoutPrompt(errorMessage, "error");

            helpMessage = "Enter 'help' for a list of functions."
            printWithoutPrompt(helpMessage, "error");
            break;
    }
}

function printFile(fileToRead){
    //split first
    let currentDirectorySplit = state.currentDirectory.split('/');
    currentDirectorySplit.shift(); //removes the tilda

    //get tempDir
    let depth = currentDirectorySplit.length;
    let i = 0;
    let tempDirectory = dataStore;
    while(i < depth){
        tempDirectory = tempDirectory[`${currentDirectorySplit[i]}`];
        i++;
    }

    if(Object.keys(linking).includes(currentDirectorySplit.at(-1))){ //checks if parent directory of fileToRead is in linking object
        // the logic here is cooked but it works, i can't simplify the explanation rn
        const currentDirectoryArray = Object.entries(tempDirectory);
        const filteredArray = currentDirectoryArray.filter(([key, value]) => {
            return value[linking[currentDirectorySplit.at(-1)]] == fileToRead;
        })
        const filteredObject = Object.fromEntries(filteredArray)[0];

        Object.entries(filteredObject).forEach(([key, value]) => {
            let formatting = `${key}: ${value}`;
            //handling links and making them clickable
            if(value.includes("https")){
                printLinkWithoutPrompt(key, value);
            }else{
                printWithoutPrompt(formatting, "normal");
            }
        })
    }else{
        tempDirectory = tempDirectory[`${fileToRead}`];
        Object.entries(tempDirectory).forEach(([key, value]) => {
            let formatting = `${key}: ${value}`;
            //handling links and making them clickable
            if(value.includes("https")){
                printLinkWithoutPrompt(key, value);
            }else{
                printWithoutPrompt(formatting, "normal");
            }
        })
    }
}

function testIsFile(searchString){
    let isFile = false;

    if(state.currentDirectory == "∼"){
        if(!Array.isArray(dataStore[`${searchString}`])){
            isFile = true;
        }
    }else{
        //split first
        let currentDirectorySplit = state.currentDirectory.split('/');
        currentDirectorySplit.shift(); //removes the tilda

        //get tempDir
        let depth = currentDirectorySplit.length;
        let i = 0;
        let tempDirectory = dataStore;
        while(i < depth){
            tempDirectory = tempDirectory[`${currentDirectorySplit[i]}`];
            i++;
        }

        tempDirectory = tempDirectory[`${searchString}`];

        if(!Array.isArray(tempDirectory)){
            isFile = true;
        }
    }
    
    if(isFile){
        return true;
    }else{
        return false;
    }
}

function testFoundInCurrentDirectory(searchString){
    let directoryItemsList = [];

    if(state.currentDirectory == "∼"){
        directoryItemsList = Object.keys(dataStore);
    }else{
        //split first
        let currentDirectorySplit = state.currentDirectory.split('/');
        currentDirectorySplit.shift(); //removes the tilda

        //get tempDir
        let depth = currentDirectorySplit.length;
        let i = 0;
        let tempDirectory = dataStore;
        while(i < depth){
            tempDirectory = tempDirectory[`${currentDirectorySplit[i]}`];
            i++;
        }

        //linking contains what to display from the object
        const directoryName = currentDirectorySplit.at(-1);
        const link = linking[directoryName];
        
        tempDirectory.forEach((item) => {
            directoryItemsList.push(item[link]);
        })
    }
    
    if(directoryItemsList.includes(searchString)){
        return true;
    }else{
        return false;
    }
}

function addToHistory(text){
    const history = document.getElementById("code-container");
    const userprompt = `anonymous@albertportfolio:${state.currentDirectory}$`;
    let lineBreak = document.createElement("br");
    const full = userprompt + " " + text;
    let content = document.createElement("span");
    content.innerText = full;
    history.append(content);
    history.append(lineBreak)
}

function printLinkWithoutPrompt(key, value){
    const history = document.getElementById("code-container");
    let lineBreak = document.createElement("br");

    let content = document.createElement("span");
    content.innerHTML = `${key}: <a href="${value}" target="_blank" class="isLink">${value}</a>`;

    history.append(content);
    history.append(lineBreak);
}

function printWithoutPrompt(text, type){

    const history = document.getElementById("code-container");
    let content = "";
    let lineBreak = document.createElement("br");

    content = document.createElement("span");
    content.innerText = text;

    if(type == "folder"){
        content.classList.add("isFolder");
    }

    if(type == "link"){
        content.classList.add("isLink");
    }

    if(type == "error"){
        content.classList.add("isError");
    }

    history.append(content);
    history.append(lineBreak);
}

function printDirectory(currentDirectory){
    //basically this function prints out the keys of the current directory

    if(currentDirectory == "∼"){ //if home directory
        Object.keys(dataStore).forEach((item) => {
            //if folder, print in alt color
            if(testIsFile(item)){
                printWithoutPrompt(item, "normal");
            }else{
                printWithoutPrompt(item, "folder");
            }
        })
    }else{
        //split first
        let currentDirectorySplit = currentDirectory.split('/');
        currentDirectorySplit.shift(); //removes the tilda

        //get tempDir
        let depth = currentDirectorySplit.length;
        let i = 0;
        let tempDirectory = dataStore;
        while(i < depth){
            tempDirectory = tempDirectory[`${currentDirectorySplit[i]}`];
            i++;
        }

        //linking contains what to display from the object
        const directoryName = currentDirectorySplit.at(-1);
        const link = linking[directoryName];
        
        tempDirectory.forEach((item) => {
            //if folder, print in alt color
            if(testIsFile(item)){
                printWithoutPrompt(item[link], "normal");
            }else{
                printWithoutPrompt(item[link], "folder");
            }
        })
    }
}

function printHelpMessage(){
    const functionlist = {
        clear: "Clears the command history.",
        ls: "Lists the contents of the current directory.",
        cd: "Changes the current directory to the one that was specified.",
        cat: "Reads out the contents of a file."
    }

    Object.keys(functionlist).forEach((item) => {
        let charLength = item.length;
        let spacePaddingToAdd = 10 - charLength;
        let spacePadding = "";
        for(i=0; i < spacePaddingToAdd; i++){
            spacePadding += " ";
        }

        let full = item + spacePadding + functionlist[item];
        printWithoutPrompt(full)
    })
}

function clearCommandHistory(){
    const history = document.getElementById("code-container");
    history.replaceChildren();
}

function updateUserPrompt(){
    const element = document.getElementById('userprompt');
    let string = `anonymous@albertportfolio:${state.currentDirectory}$`;
    element.innerText = string;
}

function attemptMatch(command){
    let threshold = 0.6 //if match is greater than 60%, replace with matched string
    let commandSplit = command.split(' ');
    let splitLength = commandSplit.length;
    let locationTo = commandSplit[1];

    if(splitLength > 2){
        let count = 0;
        while(count<splitLength){
            if(count == 0){
                locationTo = "";
            }
            if(count == 1){
                locationTo = locationTo.concat(commandSplit[count]);
            }
            if(count > 1){
                locationTo = locationTo.concat(" ", commandSplit[count]);
            }
            count++;
        }
    }

    //getting available strings to match to
    let currentDirectorySplit = state.currentDirectory.split('/');
    currentDirectorySplit.shift(); //removes the tilda

    let depth = currentDirectorySplit.length;
    let i = 0;
    let tempDirectory = dataStore;
    while(i < depth){
        tempDirectory = tempDirectory[`${currentDirectorySplit[i]}`];
        i++;
    }

    let toBeMatchedAgainst = [];
    if(Object.keys(linking).includes(currentDirectorySplit.at(-1))){
        //linking contains what to display from the object
        const directoryName = currentDirectorySplit.at(-1);
        const link = linking[directoryName];
        tempDirectory.forEach((item) => {
            toBeMatchedAgainst.push(item[link]);
        })
    }else{
        Object.keys(tempDirectory).forEach((item) => {
            toBeMatchedAgainst.push(item);
        })
    }

    if(!locationTo == null || !locationTo == ""){
        //for limiting each string to the number of chars present
        let locationToLength = locationTo.length;

        //get percentage match of string to be matched and available strings
        let currentHighest = {name: "", percentage: 0};

        toBeMatchedAgainst.forEach((item) => {
            let locationToLowered = locationTo.toLowerCase();
            let locationToSplit = locationToLowered.split("");
            let matchCharCount = 0;

            let itemLowered = item.toLowerCase();
            locationToSplit.forEach((char, index) => {
                if(char == itemLowered[index]){
                    matchCharCount += 1;
                }
            })

            let percentage = matchCharCount / locationToLength;
            if(percentage > currentHighest["percentage"]){
                currentHighest["name"] = item;
                currentHighest["percentage"] = percentage;
            }
        })

        if(currentHighest["percentage"] > threshold){
            //set to the matched one
            let builtString = commandSplit[0] + " " + currentHighest["name"];
            setCommandLine(builtString)
        }
    }
}

function pushToCommandHistory(command){
    commandHistory.push(command);
    console.log(commandHistory);
}

function viewPrevCommandHistory(){
    let command = commandHistory.at(state.commandHistoryPosition);
    setCommandLine(command);
    if(state.commandHistoryPosition > (-commandHistory.length)){
        state.commandHistoryPosition -= 1;
    }
}

function viewNextCommandHistory(){
    let command = commandHistory.at(state.commandHistoryPosition);
    setCommandLine(command);
    if(state.commandHistoryPosition < -1){
        state.commandHistoryPosition += 1;
    }
}

function setCommandLine(commandToBeSetTo){
    let inputBox = document.getElementById("input-field");
    inputBox.value = commandToBeSetTo;
    inputBox.focus(); //set focus back onto input field
}

function initialize(){
    const inputField = document.getElementById("input-field");
    //adds event listeners to process when 'enter' keydown
    inputField.addEventListener('keydown', function(e) {
        if(e.key === 'Enter'){
            const command = inputField.value.trim();
            addToHistory(command);
            processInput(command);
            inputField.value = "";
            state.commandHistoryPosition = -1;
        }
 
        if(e.key === 'Tab'){
            e.preventDefault(); //needed so that pressing tab doesnt change focus
            const incompleteCommand = inputField.value.trim();
            attemptMatch(incompleteCommand);
        }

        if(e.key === 'ArrowUp'){
            viewPrevCommandHistory();
            console.log(state.commandHistoryPosition);
        }

        if(e.key === 'ArrowDown'){
            viewNextCommandHistory();
            console.log(state.commandHistoryPosition);
        }
    })
    //focus to text input when page loads
    inputField.focus();

    //focuses on inputfield when clicked anywhere on crt-container
    const crtContainer = document.getElementById("crt-container");
    crtContainer.addEventListener('click', function(e){
        inputField.focus();
    })
}

document.addEventListener("DOMContentLoaded", async (event) => {
    await loadData();
    initialize();
    updateUserPrompt();

    // flash();
});

function flash(){
    animate('.flash-element', {
        opacity: [1, 0.2], // Animate from full opacity (1) to low opacity (0.2)
        duration: 500,     // Duration of each transition in milliseconds
        easing: 'easeInOutQuad',
        direction: 'alternate', // Reverse the animation direction
        loop: true             // Loop indefinitely
    });
}

//AHHHHHHHHHHHHHHHH
//future function to add, store data to localstorage
//check if localstorage has data, if yes use that, else fetch and store again

//settings button, change font color, disable certain effects to make it easier to read

//change logged in account username

//some sort of system for animating
//able to handle:
    //randomizing different startup sequences
    //applying the css styles for anime.js
    //