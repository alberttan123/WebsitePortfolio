function formatHeader(){
    let url = window.location.pathname.toLowerCase();

    if(url.includes("home")){
        let element = document.getElementById("header-home");
        element.classList.add("current-page");
    }

    if(url.includes("commandline")){
        let element = document.getElementById("header-commandline");
        element.classList.add("current-page");

        let dropdownElement = "";
        if(url.includes("scroll")){
            dropdownElement = document.getElementById("header-scrolltype");
        }else{
            dropdownElement = document.getElementById("header-manualtype");
        }

        dropdownElement.classList.add("current-page");
    }
}

function openDropdown(){
    //select dropdown element
    dropdown = document.getElementById("dropdown");
    dropdown.classList.toggle("hide");
}

document.addEventListener("DOMContentLoaded", async (event) => {
    formatHeader();
});