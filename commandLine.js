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
    fontColor: "white"
}

let linking = {
    WorkExperience: "Role",
    CtfExperience: "CTF Name",
    Education: "Qualification",
    Certificates: "Certificate Name",
    Projects: "Project Title"
}

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
        //AHHHHHHHHHHHHHH - do error handling when unable to fetch data
    }
}

function processInput(input){
    console.log(input);
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
        case (/^cd\b/gm.test(input)): //checks if input starts with cd
            var split = input.split(' ');
            var splitLength = split.length;
            var locationTo = split[1];

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
                var parentDir = state.currentDirectory.split('/');
                parentDir.pop();
                
                //rebuild
                var newDir = "";
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

            var isFoundInCurrDir = testFoundInCurrentDirectory(locationTo);
            if(!isFoundInCurrDir){
                errorMessage = `cd: no such file or directory: ${locationTo}`;
                printWithoutPrompt(errorMessage);
                break;
            }

            var isFile = testIsFile(locationTo);
            if(isFile){
                errorMessage = `cd: ${locationTo}: Not a directory`;
                printWithoutPrompt(errorMessage);
                break;
            }

            state.currentDirectory = state.currentDirectory.concat('/', locationTo);
            updateUserPrompt();
            break;
        case (/^cat\b/gm.test(input)): //checks if input starts with cat
            var split = input.split(' ');
            var splitLength = split.length;
            var fileToRead = split[1];

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

            var isFile = testIsFile(fileToRead);
            if(isFile){
                //print contents of file
                printFile(fileToRead);
            }else{
                //show error message
                errorMessage = `cat: ${fileToRead}: Is a directory`;
                printWithoutPrompt(errorMessage);
            }
            break;
        case (!functionlist.includes(input)):
            errorMessage = input + ": command not found";
            printWithoutPrompt(errorMessage);

            helpMessage = "Enter 'help' for a list of functions."
            printWithoutPrompt(helpMessage);
            break;
    }
}

function printFile(fileToRead){
    //split first
    var currentDirectorySplit = state.currentDirectory.split('/');
    currentDirectorySplit.shift(); //removes the tilda

    //get tempDir
    var depth = currentDirectorySplit.length;
    var i = 0;
    var tempDirectory = dataStore;
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
            printWithoutPrompt(formatting);
        })
    }else{
        tempDirectory = tempDirectory[`${fileToRead}`];
        Object.entries(tempDirectory).forEach(([key, value]) => {
            let formatting = `${key}: ${value}`;
            printWithoutPrompt(formatting);
        })
    }
}

function testIsFile(searchString){
    var isFile = false;

    if(state.currentDirectory == "∼"){
        if(!Array.isArray(dataStore[`${searchString}`])){
            isFile = true;
        }
    }else{
        //split first
        var currentDirectorySplit = state.currentDirectory.split('/');
        currentDirectorySplit.shift(); //removes the tilda

        //get tempDir
        var depth = currentDirectorySplit.length;
        var i = 0;
        var tempDirectory = dataStore;
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
    var directoryItemsList = [];

    if(state.currentDirectory == "∼"){
        directoryItemsList = Object.keys(dataStore);
    }else{
        //split first
        var currentDirectorySplit = state.currentDirectory.split('/');
        currentDirectorySplit.shift(); //removes the tilda

        //get tempDir
        var depth = currentDirectorySplit.length;
        var i = 0;
        var tempDirectory = dataStore;
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
    history.append(full);
    history.append(lineBreak)
}

function printWithoutPrompt(text){
    const history = document.getElementById("code-container");
    let lineBreak = document.createElement("br");
    history.append(text);
    history.append(lineBreak)
}

function printDirectory(currentDirectory){
    //basically this function prints out the keys of the current directory

    if(currentDirectory == "∼"){ //if home directory
        Object.keys(dataStore).forEach((item) => {
            printWithoutPrompt(item);
            //need to handle personal information - e.g. 'file' - basically file vs folder display handling
        })
    }else{
        //split first
        var currentDirectorySplit = currentDirectory.split('/');
        currentDirectorySplit.shift(); //removes the tilda

        //get tempDir
        var depth = currentDirectorySplit.length;
        var i = 0;
        var tempDirectory = dataStore;
        while(i < depth){
            tempDirectory = tempDirectory[`${currentDirectorySplit[i]}`];
            i++;
        }

        //linking contains what to display from the object
        const directoryName = currentDirectorySplit.at(-1);
        const link = linking[directoryName];
        
        tempDirectory.forEach((item) => {
            printWithoutPrompt(item[link]);
        })
    }

    //AHHHHHHHHHHHHHH - need to make function to detect if child is or contains array, apply style based on that
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
        console.log(spacePaddingToAdd);
        var spacePadding = "";
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
    var string = `anonymous@albertportfolio:${state.currentDirectory}$`;
    element.innerText = string;
}

function initialize(){
    const inputField = document.getElementById("input-field");
    //adds event listeners to process when 'enter' keydown
    inputField.addEventListener('keydown', function(e) {
        if(e.key === 'Enter' || e.keyCode === 13){
            const command = inputField.value.trim();
            addToHistory(command);
            processInput(command);
            inputField.value = "";
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

//PROGRESS UPDATE
//
//currently working on implementing cd and ls
//facing issue with the data being stored in array in the json
//-need to handle ls based on certain key, for each array 
//-need to handle cd based on certain key, for each array
//
//facing another issue with matching display dir name vs dataStore dir name
//-either remove the thing that makes it easier to read, or make a handler to programmatically transform to standardized format
//