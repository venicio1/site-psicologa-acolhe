const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const rafThrottle = (fn) => {
    let rafId = null;
    return (...args) => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            fn(...args);
            rafId = null;
        });
    };
};

const debounce = (fn, delay = 150) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const navToggle = $('.nav__toggle');
const navMenu = $('#nav-menu');
const navLinks = $$('.nav__link');

if (navToggle && navMenu) {
    const closeMenu = () => {
        navToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('nav__menu--open');
        document.body.style.overflow = '';
    };

    navToggle.addEventListener('click', () => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isOpen);
        navMenu.classList.toggle('nav__menu--open');
        document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    navLinks.forEach(link => link.addEventListener('click', closeMenu));

    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
}

const header = $('#header');
const headerScrollThreshold = 50;

const handleHeaderScroll = rafThrottle(() => {
    if (window.scrollY > headerScrollThreshold) {
        header.classList.add('header--scrolled');
    } else {
        header.classList.remove('header--scrolled');
    }
});

window.addEventListener('scroll', handleHeaderScroll, { passive: true });

$$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = $(targetId);
        if (target) {
            e.preventDefault();
            const headerHeight = header.offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            target.removeAttribute('tabindex');
        }
    });
});

const revealSelectors = [
    '.section__header',
    '.sobre__image',
    '.sobre__content',
    '.consultorio__image',
    '.consultorio__item',
    '.processo__step',
    '.cta__content',
    '.cta__info',
    '.footer__brand'
];

const revealElements = revealSelectors.flatMap(sel => $$(sel));

const sectionDelays = new Map();
revealElements.forEach(el => {
    const section = el.closest('section') || el.closest('footer');
    if (!sectionDelays.has(section)) sectionDelays.set(section, 0);
    const delay = sectionDelays.get(section);
    el.style.transitionDelay = `${delay * 100}ms`;
    sectionDelays.set(section, delay + 1);
    el.classList.add('reveal');
});

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.05,
    rootMargin: '0px 0px -30px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

const carouselTrack = $('.depoimentos__track');
const carouselDots = $('.depoimentos__dots');
const testimonials = $$('.depoimento');
const carouselContainer = $('.depoimentos__carousel');

let currentSlide = 0;
let autoSlideInterval = null;
let touchStartX = 0;
let touchCurrentX = 0;
let isDragging = false;
const slideCount = testimonials.length;

function getVisibleSlides() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
}

function getSlideWidth() {
    const visible = getVisibleSlides();
    return 100 / visible;
}

function getMaxSlideIndex() {
    return Math.max(0, slideCount - getVisibleSlides());
}

function updateCarousel(instant = false) {
    const visibleSlides = getVisibleSlides();
    const slideWidth = getSlideWidth();
    const offset = -currentSlide * slideWidth;

    carouselTrack.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    carouselTrack.style.transform = `translateX(${offset}%)`;

    const dots = $$('.depoimentos__dots button');
    const maxIndex = getMaxSlideIndex();
    dots.forEach((dot, i) => {
        dot.setAttribute('aria-selected', i === Math.min(currentSlide, maxIndex));
        dot.style.display = i <= maxIndex ? 'block' : 'none';
    });
}

function goToSlide(index) {
    const maxIndex = getMaxSlideIndex();
    currentSlide = Math.max(0, Math.min(index, maxIndex));
    updateCarousel();
}

function nextSlide() {
    const maxIndex = getMaxSlideIndex();
    currentSlide = currentSlide >= maxIndex ? 0 : currentSlide + 1;
    updateCarousel();
}

function prevSlide() {
    const maxIndex = getMaxSlideIndex();
    currentSlide = currentSlide <= 0 ? maxIndex : currentSlide - 1;
    updateCarousel();
}

function startAutoSlide() {
    stopAutoSlide();
    autoSlideInterval = setInterval(nextSlide, 6000);
}

function stopAutoSlide() {
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
    }
}

if (carouselTrack && slideCount > 1) {
    testimonials.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', `Depoimento ${i + 1}`);
        btn.setAttribute('aria-selected', i === 0);
        btn.addEventListener('click', () => goToSlide(i));
        carouselDots.appendChild(btn);
    });

    carouselTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        isDragging = true;
        stopAutoSlide();
        carouselTrack.style.transition = 'none';
    }, { passive: true });

    carouselTrack.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        touchCurrentX = e.touches[0].clientX;
        const diff = touchStartX - touchCurrentX;
        const visibleSlides = getVisibleSlides();
        const slideWidth = getSlideWidth();
        const baseOffset = -currentSlide * slideWidth;
        const dragOffset = (diff / carouselTrack.offsetWidth) * 100 * visibleSlides;
        carouselTrack.style.transform = `translateX(${baseOffset + dragOffset}%)`;
    }, { passive: true });

    carouselTrack.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        const diff = touchStartX - touchCurrentX;
        const threshold = carouselTrack.offsetWidth * 0.15;

        if (Math.abs(diff) > threshold) {
            diff > 0 ? nextSlide() : prevSlide();
        } else {
            updateCarousel();
        }
        startAutoSlide();
    });

    carouselTrack.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        touchStartX = e.clientX;
        isDragging = true;
        stopAutoSlide();
        carouselTrack.style.transition = 'none';
        carouselTrack.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        touchCurrentX = e.clientX;
        const diff = touchStartX - touchCurrentX;
        const visibleSlides = getVisibleSlides();
        const slideWidth = getSlideWidth();
        const baseOffset = -currentSlide * slideWidth;
        const dragOffset = (diff / carouselTrack.offsetWidth) * 100 * visibleSlides;
        carouselTrack.style.transform = `translateX(${baseOffset + dragOffset}%)`;
    });

    window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        const diff = touchStartX - touchCurrentX;
        const threshold = carouselTrack.offsetWidth * 0.15;
        carouselTrack.style.cursor = 'grab';

        if (Math.abs(diff) > threshold) {
            diff > 0 ? nextSlide() : prevSlide();
        } else {
            updateCarousel();
        }
        startAutoSlide();
    });

    carouselContainer.addEventListener('mouseenter', stopAutoSlide);
    carouselContainer.addEventListener('mouseleave', startAutoSlide);
    carouselContainer.addEventListener('focusin', stopAutoSlide);
    carouselContainer.addEventListener('focusout', startAutoSlide);

    carouselContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevSlide();
            stopAutoSlide();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextSlide();
            stopAutoSlide();
        }
    });

    window.addEventListener('resize', debounce(() => {
        const maxIndex = getMaxSlideIndex();
        currentSlide = Math.min(currentSlide, maxIndex);
        updateCarousel(true);
    }));

    updateCarousel();
    startAutoSlide();
}

$$('.faq__question').forEach(question => {
    question.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            question.click();
        }
    });
});

function handleImageLoad(img) {
    img.classList.add('loaded');
}

$$('img').forEach(img => {
    if (img.complete) {
        handleImageLoad(img);
    } else {
        img.addEventListener('load', () => handleImageLoad(img), { once: true });
        img.addEventListener('error', () => handleImageLoad(img), { once: true });
    }
});

if (!('loading' in HTMLImageElement.prototype)) {
    const lazyImages = $$('img[loading="lazy"]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.removeAttribute('loading');
                imageObserver.unobserve(img);
            }
        });
    });
    lazyImages.forEach(img => imageObserver.observe(img));
}

$$('a[href*="wa.me"]').forEach(link => {
    link.addEventListener('click', () => {
        console.log('WhatsApp click tracked');
    });
});

function preloadCriticalImages() {
    const criticalImages = [
        'images/retrato.png',
        'images/consultorio.png',
        'images/atendimento.png'
    ];

    criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

requestIdleCallback(preloadCriticalImages, { timeout: 2000 });

console.log('%c🧠 Dra. Marina Silva - Psicóloga Clínica', 'font-size: 16px; font-weight: bold; color: #C47A5C;');
console.log('%cSite desenvolvido com carinho para acolher pessoas.', 'font-size: 12px; color: #8B837A;');
console.log('%cCRP 06/123456 | marina@marinapsicologa.com.br', 'font-size: 11px; color: #B8B0A7;');