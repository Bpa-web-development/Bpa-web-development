const heroImage = document.getElementById("heroMissionImage");
const thumbnailContainer = document.getElementById("missionThumbnails");

let images = [];
let currentImage = 0;

let slideshowInterval;
let isPaused = false;

fetch("/data/mission.json")
    .then(response => response.json())
    .then(data => {

        images = data;

        heroImage.src = images[0].image;
        heroImage.alt = images[0].alt;

        createThumbnails();

        startSlideshow();

    })
    .catch(error => console.error(error));

function createThumbnails(){

    thumbnailContainer.innerHTML = "";

    images.forEach((photo,index)=>{

        const img = document.createElement("img");

        img.src = photo.image;
        img.alt = photo.alt;
        img.classList.add("thumb");

        if(index===0){
            img.classList.add("active");
        }

        img.addEventListener("click",()=>{

            currentImage = index;

            showImage(currentImage);

            restartSlideshow();

        });

        thumbnailContainer.appendChild(img);

    });

}

function showImage(index){

    heroImage.classList.add("fade-out");

    setTimeout(()=>{

        heroImage.src = images[index].image;
        heroImage.alt = images[index].alt;

        heroImage.classList.remove("fade-out");

        document.querySelectorAll(".thumb").forEach((thumb,i)=>{

            thumb.classList.toggle("active", i===index);

        });

    },950);

}

function nextImage(){

    currentImage++;

    if(currentImage >= images.length){
        currentImage = 0;
    }

    showImage(currentImage);

}

function startSlideshow(){

    slideshowInterval = setInterval(()=>{

        if(!isPaused){
            nextImage();
        }

    },7600);

}

function restartSlideshow(){

    clearInterval(slideshowInterval);

    startSlideshow();

}

heroImage.addEventListener("mouseenter",()=>{

    isPaused = true;

});

heroImage.addEventListener("mouseleave",()=>{

    isPaused = false;

});