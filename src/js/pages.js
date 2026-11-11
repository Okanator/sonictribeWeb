document.addEventListener('DOMContentLoaded',function(){
  var parts=[].slice.call(document.querySelectorAll('.st-pj-part'));
  parts.forEach(function(s,i){if(i%2)s.classList.add('st-alt')});
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('st-in');io.unobserve(e.target)}})},{threshold:.25});parts.forEach(function(s){io.observe(s)})}else{parts.forEach(function(s){s.classList.add('st-in')})}
});
