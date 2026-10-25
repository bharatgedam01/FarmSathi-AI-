// FarmSaathi AI — Navigation & Section Switching
// Handles page transitions, active navigation button styling, breadcrumb updates, and page loader dispatch.

(function(window) {
  'use strict';

  var PAGE_TITLES = {
    dashboard: 'FARMER WORKSPACE / DASHBOARD OVERVIEW',
    profile: 'FARMER WORKSPACE / FARMER PROFILE',
    crops: 'FARMER WORKSPACE / MY FARMS & CROPS',
    assistant: 'FARMER WORKSPACE / ASK FARMSAATHI AI',
    intelligence: 'FARMER WORKSPACE / FARM INTELLIGENCE',
    weather: 'FARMER WORKSPACE / WEATHER & FORECAST',
    market: 'FARMER WORKSPACE / MANDI MARKET PRICES',
    activities: 'FARMER WORKSPACE / FARM REMINDERS & ACTIVITIES',
    history: 'FARMER WORKSPACE / CROP ANALYSIS HISTORY',
    help: 'FARMER WORKSPACE / KISAN HELPLINES & SUPPORT',
    settings: 'FARMER WORKSPACE / SETTINGS & HEALTH'
  };

  function navigateTo(pageId) {
    if (!pageId) return;
    console.log('Navigating to section:', pageId);

    // 1. Hide all page sections
    var sections = document.querySelectorAll('.page-section');
    for (var i = 0; i < sections.length; i++) {
      sections[i].classList.remove('active');
      sections[i].style.setProperty('display', 'none', 'important');
    }

    // 2. Show the target page section
    var target = document.getElementById('page-' + pageId);
    if (target) {
      target.classList.add('active');
      target.style.setProperty('display', 'block', 'important');
    }

    // 3. Highlight active sidebar button
    var navBtns = document.querySelectorAll('.nav-btn');
    for (var j = 0; j < navBtns.length; j++) {
      if (navBtns[j].getAttribute('data-page') === pageId) {
        navBtns[j].classList.add('active');
      } else {
        navBtns[j].classList.remove('active');
      }
    }

    // 4. Update Header Breadcrumb Title
    var eyebrow = document.getElementById('headerEyebrow');
    if (eyebrow && PAGE_TITLES[pageId]) {
      eyebrow.textContent = PAGE_TITLES[pageId];
    }

    // 5. Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 6. Trigger section loader if registered
    if (typeof window.onPageNavigated === 'function') {
      try {
        window.onPageNavigated(pageId);
      } catch (err) {
        console.warn('Page navigation loader notice:', err);
      }
    }
  }

  // Section loader dispatcher
  window.onPageNavigated = function(pageId) {
    if (pageId === 'profile' && typeof window.loadProfileForm === 'function') {
      window.loadProfileForm();
    } else if (pageId === 'crops' && typeof window.renderCropsList === 'function') {
      window.renderCropsList();
    } else if (pageId === 'activities' && typeof window.renderActivitiesList === 'function') {
      window.renderActivitiesList();
    } else if (pageId === 'history' && typeof window.renderHistoryList === 'function') {
      window.renderHistoryList();
    } else if (pageId === 'market' && typeof window.fetchMandiPrices === 'function') {
      window.fetchMandiPrices();
    } else if (pageId === 'settings' && typeof window.renderSettings === 'function') {
      window.renderSettings();
    } else if (pageId === 'weather' && typeof window.fetchWeather === 'function') {
      var searchInput = document.getElementById('weatherSearchLocation');
      if (searchInput && searchInput.value) {
        window.fetchWeather(searchInput.value);
      }
    }
  };

  // Bind navigation listeners once DOM is ready
  function initNavigation() {
    var navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var p = this.getAttribute('data-page');
        if (p) navigateTo(p);
      });
    });
  }

  window.navigateTo = navigateTo;
  window.addEventListener('DOMContentLoaded', initNavigation);

})(window);
