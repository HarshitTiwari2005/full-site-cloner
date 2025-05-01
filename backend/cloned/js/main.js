(function () {

  'use strict';

  // preloader
  $(window).on('load', function () {
    $('.loader').fadeOut('slow');
  });

  // smooth scroll
  $("a").on("click", function (event) {

    if (this.hash !== "") {
      event.preventDefault();

      var hash = this.hash;

      $("html, body").animate({

        scrollTop: $(hash).offset().top - 50

      }, 850);

    }

  });

  // swiper slider
  $(document).ready(function () {
    var swiper = new Swiper(".mySwiper", {
      slidesPerView: 1,
      spaceBetween: 30,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      navigation: {
        nextEl: ".next-slide",
        prevEl: ".prev-slide"
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 1,
        },
        780: {
          slidesPerView: 1,
        }
      }
    });
  });

  // navbar hide on click
  $(".navbar li a").on("click", function () {
    $(".navbar-collapse").collapse("hide");
  });

  // navbar on scroll
  $(window).on("scroll", function () {

    var onScroll = $(this).scrollTop();

    if (onScroll > 50) {
      $(".navbar").addClass("navbar-fixed");
    }
    else {
      $(".navbar").removeClass("navbar-fixed");
    }

  });

})();

// Email encryption to prevent spam
function decryptEmail() {
  var encoded = "vasb@fxljbex.va"; // ROT13 encoded email
  var decoded = "";
  for (var i = 0; i < encoded.length; i++) {
    var c = encoded.charCodeAt(i);
    if (c >= 97 && c <= 122) { // a-z
      decoded += String.fromCharCode((c - 97 + 13) % 26 + 97);
    } else if (c >= 65 && c <= 90) { // A-Z
      decoded += String.fromCharCode((c - 65 + 13) % 26 + 65);
    } else {
      decoded += encoded.charAt(i);
    }
  }
  window.location.href = "mailto:" + decoded;
}

// Phone encryption to prevent spam
function decryptPhone() {
  var encoded = "+91 9029208698".split('').map(function (c) {
    if (c >= '0' && c <= '9') {
      return String.fromCharCode(((c.charCodeAt(0) - 48 + 5) % 10) + 48);
    }
    return c;
  }).join('');
  var decoded = "+91 9029208698";
  window.location.href = "tel:" + decoded.replace(/\s/g, '');
}
