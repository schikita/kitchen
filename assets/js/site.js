/* KitchenCraft — site.js (не трогает логику игры) */
(function () {
    'use strict';

    /* ===== Scroll-reveal (IntersectionObserver) ===== */
    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add('is-in-view');
                    io.unobserve(e.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => io.observe(el));

    /* ===== data-bg + img[data-lazy-src] (проекты/баннеры) ===== */
    document.querySelectorAll('[data-bg]').forEach((el) => {
        const bg = el.getAttribute('data-bg');
        if (!bg) return;
        const img = new Image();
        img.onload = () => {
            el.style.backgroundImage = `url('${bg}')`;
        };
        img.onerror = () => {
            // Оставляем дефолтный фон (если он задан в CSS) — ничего не ломаем.
        };
        img.src = bg;
    });

    document.querySelectorAll('img[data-lazy-src]').forEach((img) => {
        const src = img.getAttribute('data-lazy-src');
        if (!src) return;
        if (img.getAttribute('src')) return;

        img.setAttribute('src', src);
        img.onerror = () => {
            img.onerror = null;
            // Fallback, чтобы не было «битых» картинок
            img.setAttribute('src', 'assets/sprites/plate.png');
        };
    });

    /* ===== Active project card on hover ===== */
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            projectCards.forEach((c) => c.classList.remove('is-active'));
            card.classList.add('is-active');
        });
    });

    /* ===== Back to top ===== */
    const backBtn = document.getElementById('backToTop');
    if (backBtn) {
        window.addEventListener('scroll', () => {
            backBtn.classList.toggle('show', window.scrollY > 500);
        }, { passive: true });
        backBtn.addEventListener('click', () =>
            window.scrollTo({ top: 0, behavior: 'smooth' })
        );
    }

    /* ===== Burger / mobile nav ===== */
    const burger = document.getElementById('burgerBtn');
    const nav = document.querySelector('.header-nav');
    if (burger && nav) {
        burger.addEventListener('click', () => {
            const open = burger.classList.toggle('open');
            nav.classList.toggle('open', open);
            burger.setAttribute('aria-expanded', String(open));
        });

        // Закрываем при клике на ссылку
        nav.querySelectorAll('a').forEach((a) =>
            a.addEventListener('click', () => {
                burger.classList.remove('open');
                nav.classList.remove('open');
            })
        );
    }

    /* ===== Smooth scroll for anchors ===== */
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* ===== Parallax hero bg (лёгкий) ===== */
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        window.addEventListener('scroll', () => {
            const y = window.scrollY;
            heroBg.style.transform = `scale(1.04) translateY(${y * 0.22}px)`;
        }, { passive: true });
    }

    /* ===== CTA Form submit ===== */
    window.handleCTASubmit = function (e) {
        e.preventDefault();
        const form = e.target;
        form.reset();
        showToast('🎉 Заявка отправлена! Мы свяжемся с вами в течение часа.');
    };

    function showToast(msg) {
        let toast = document.getElementById('siteToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'siteToast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    /* ===== Sticky header shadow on scroll ===== */
    const header = document.querySelector('.site-header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.style.boxShadow = window.scrollY > 60
                ? '0 4px 32px rgba(0,0,0,.35)'
                : '';
        }, { passive: true });
    }

})();