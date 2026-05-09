/**
 * Reev Joomla Template - Main JavaScript Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
  initTemplate();
});

function initTemplate() {
  initMobileMenu();
  initHeaderScroll();
  initSmoothScroll();
}

/**
 * Мобильное меню: гамбургер-тоггл
 */
function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const hamburger = toggle?.querySelector('svg:not([data-close-icon])');
  const closeIcon = toggle?.querySelector('[data-close-icon]');
  
  if (!toggle || !menu) return;
  
  // Переключение видимости
  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    
    // Переключаем состояния
    toggle.setAttribute('aria-expanded', String(!isExpanded));
    menu.classList.toggle('hidden');
    
    // Меняем иконки
    if (hamburger && closeIcon) {
      hamburger.classList.toggle('hidden', !isExpanded);
      closeIcon.classList.toggle('hidden', isExpanded);
    }
    
    // Блокируем скролл фона при открытом меню
    document.body.classList.toggle('overflow-hidden', !isExpanded);
  });
  
  // Закрытие при клике на ссылку меню
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="#"], a[href*="/"]')) {
      toggle.click(); // Закрываем меню
    }
  });
  
  // Закрытие по Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
      toggle.click();
      toggle.focus(); // Возвращаем фокус на кнопку
    }
  });
  
  // Закрытие при клике вне меню
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('hidden') && 
        !menu.contains(e.target) && 
        !toggle.contains(e.target)) {
      toggle.click();
    }
  });
}

/**
 * Хедер: эффекты при скролле
 */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Добавляем класс при скролле вниз
    if (currentScroll > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    
    // Опционально: скрывать хедер при скролле вниз, показывать при вверх
    // if (currentScroll > lastScroll && currentScroll > 100) {
    //   header.classList.add('hidden');
    // } else {
    //   header.classList.remove('hidden');
    // }
    // lastScroll = currentScroll;
  }, { passive: true });
}

/**
 * Плавная прокрутка для якорных ссылок
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerOffset = document.querySelector('.site-header')?.offsetHeight || 0;
        const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset - 20;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// HMR для разработки
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('🔄 Module updated, reinitializing...');
    initTemplate();
  });
}

// Экспорт для использования в других модулях
export { initTemplate, initMobileMenu, initHeaderScroll };