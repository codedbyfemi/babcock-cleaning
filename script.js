const carousel = document.querySelector('.carousel-inner');
const nextBtn = document.querySelector('.next');
const prevBtn = document.querySelector('.prev');

let scrollAmount = 0;
const scrollStep = 280; // Adjust based on box width + margin

nextBtn.addEventListener('click', () => {
  carousel.scrollBy({ left: scrollStep, behavior: 'smooth' });
});

prevBtn.addEventListener('click', () => {
  carousel.scrollBy({ left: -scrollStep, behavior: 'smooth' });
});

// Scroll to top button functionality
const scrollTopBtn = document.getElementById("scrollTopBtn");

window.onscroll = function () {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    scrollTopBtn.style.display = "block";
  } else {
    scrollTopBtn.style.display = "none";
  }
};

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});
