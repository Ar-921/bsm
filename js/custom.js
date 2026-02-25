$(function () {



  // Header Scroll
  $(window).scroll(function () {
    if ($(window).scrollTop() >= 60) {
      $("header").addClass("fixed-header");
    } else {
      $("header").removeClass("fixed-header");
    }
  });


  // Featured Owl Carousel
  $('.featured-projects-slider .owl-carousel').owlCarousel({
    center: true,
    loop: true,
    margin: 30,
    nav: false,
    dots: false,
    autoplay: true,
    autoplayTimeout: 5000,
    autoplayHoverPause: false,
    responsive: {
      0: { items: 1 },
      600: { items: 2 },
      1000: { items: 3 },
      1200: { items: 4 }
    }
  })


  // Count
  $('.count').each(function () {
    $(this).prop('Counter', 0).animate({
      Counter: $(this).text()
    }, {
      duration: 1000,
      easing: 'swing',
      step: function (now) {
        $(this).text(Math.ceil(now));
      }
    });
  });


  // ScrollToTop
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  const btn = document.getElementById("scrollToTopBtn");
  if (btn) {
    btn.addEventListener("click", scrollToTop);
  }

  window.onscroll = function () {
    const btn = document.getElementById("scrollToTopBtn");
    if (!btn) return;

    if (document.documentElement.scrollTop > 100 || document.body.scrollTop > 100) {
      btn.style.display = "flex";
    } else {
      btn.style.display = "none";
    }
  };


  // Aos
  AOS.init({
    once: true,
  });


  // ✅ ADD HERE (before closing bracket)
  $(".header-link").on("click", function () {
    const el = $(this);

    el.css("transform", "scale(.96)");

    setTimeout(function () {
      el.css("transform", "");
    }, 150);
  });

  // Auto Active Menu Link
  $(".header-link").each(function () {
    if (this.href === window.location.href) {
      $(this).addClass("active");
    }
  });

  

});


