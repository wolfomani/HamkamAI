// Main website JavaScript
document.addEventListener("DOMContentLoaded", () => {
  // Navigation functionality
  const navToggle = document.querySelector(".nav-toggle")
  const navMenu = document.querySelector(".nav-menu")

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active")
    })
  }

  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })

  // Active navigation link highlighting
  const sections = document.querySelectorAll("section[id]")
  const navLinks = document.querySelectorAll(".nav-link")

  function updateActiveNav() {
    let current = ""
    sections.forEach((section) => {
      const sectionTop = section.offsetTop
      const sectionHeight = section.clientHeight
      if (scrollY >= sectionTop - 200) {
        current = section.getAttribute("id")
      }
    })

    navLinks.forEach((link) => {
      link.classList.remove("active")
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active")
      }
    })
  }

  window.addEventListener("scroll", updateActiveNav)

  // Intersection Observer for animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fade-in")
      }
    })
  }, observerOptions)

  // Observe all sections and cards
  document.querySelectorAll("section, .feature-card, .model-card, .pricing-card").forEach((el) => {
    observer.observe(el)
  })

  // Counter animation for stats
  function animateCounters() {
    const counters = document.querySelectorAll(".stat-number")
    counters.forEach((counter) => {
      const target = Number.parseInt(counter.textContent.replace(/[^\d]/g, ""))
      const increment = target / 100
      let current = 0

      const updateCounter = () => {
        if (current < target) {
          current += increment
          counter.textContent =
            Math.ceil(current) +
            (counter.textContent.includes("+") ? "+" : "") +
            (counter.textContent.includes("%") ? "%" : "")
          requestAnimationFrame(updateCounter)
        } else {
          counter.textContent = counter.textContent // Reset to original
        }
      }

      updateCounter()
    })
  }

  // Trigger counter animation when stats section is visible
  const statsSection = document.querySelector(".hero-stats")
  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounters()
          statsObserver.unobserve(entry.target)
        }
      })
    })
    statsObserver.observe(statsSection)
  }

  // Pricing card hover effects
  document.querySelectorAll(".pricing-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = card.classList.contains("featured") ? "scale(1.05) translateY(-10px)" : "translateY(-10px)"
    })

    card.addEventListener("mouseleave", () => {
      card.style.transform = card.classList.contains("featured") ? "scale(1.05)" : "none"
    })
  })

  // Model card interactions
  document.querySelectorAll(".model-card").forEach((card) => {
    card.addEventListener("click", () => {
      // Add selection effect
      document.querySelectorAll(".model-card").forEach((c) => c.classList.remove("selected"))
      card.classList.add("selected")

      // Store selected model
      localStorage.setItem("selectedModel", card.querySelector(".model-name").textContent)
    })
  })

  // Feature card animations
  document.querySelectorAll(".feature-card").forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`
  })

  // Parallax effect for hero section
  window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset
    const parallax = document.querySelector(".hero-visual")
    if (parallax) {
      const speed = scrolled * 0.5
      parallax.style.transform = `translateY(${speed}px)`
    }
  })

  // Dynamic background particles
  function createParticles() {
    const particlesContainer = document.createElement("div")
    particlesContainer.className = "particles-container"
    particlesContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        `

    for (let i = 0; i < 50; i++) {
      const particle = document.createElement("div")
      particle.className = "particle"
      particle.style.cssText = `
                position: absolute;
                width: 2px;
                height: 2px;
                background: rgba(99, 102, 241, 0.3);
                border-radius: 50%;
                animation: float ${Math.random() * 10 + 5}s linear infinite;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation-delay: ${Math.random() * 5}s;
            `
      particlesContainer.appendChild(particle)
    }

    document.body.appendChild(particlesContainer)
  }

  // Add particle animation CSS
  const style = document.createElement("style")
  style.textContent = `
        @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        
        .particles-container .particle {
            animation-timing-function: linear;
        }
        
        .fade-in {
            animation: fadeIn 0.8s ease-out forwards;
        }
        
        .model-card.selected {
            border-color: var(--primary-color);
            background: linear-gradient(135deg, var(--bg-card), rgba(99, 102, 241, 0.1));
            transform: translateY(-5px);
        }
    `
  document.head.appendChild(style)

  // Initialize particles
  createParticles()

  // Lazy loading for images
  const images = document.querySelectorAll("img[data-src]")
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        img.classList.remove("lazy")
        imageObserver.unobserve(img)
      }
    })
  })

  images.forEach((img) => imageObserver.observe(img))

  // Performance monitoring
  if ("performance" in window) {
    window.addEventListener("load", () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
      console.log(`Page loaded in ${loadTime}ms`)
    })
  }

  // Service Worker registration for PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => console.log("SW registered"))
      .catch((error) => console.log("SW registration failed"))
  }
})

// Utility functions
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function throttle(func, limit) {
  let inThrottle
  return function () {
    const args = arguments
    
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Export for use in other modules
window.HamkamUtils = {
  debounce,
  throttle,
}
