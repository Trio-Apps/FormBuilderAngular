# DOM Mutation Event Deprecation Warning

## ⚠️ تحذير Deprecation

قد ترى تحذيراً في الـ browser console:

```
[Deprecation] Listener added for a synchronous 'DOMNodeInsertedIntoDocument' DOM Mutation Event.
```

## 📋 ما هو هذا التحذير؟

هذا التحذير يأتي من الـ **browser engine** نفسه عندما يتم إضافة event listener لـ DOM Mutation Events من مكتبات خارجية مثل:
- PrimeNG
- CoreUI

## ✅ هل يؤثر على التطبيق؟

**لا، هذا التحذير لا يؤثر على وظائف التطبيق بأي شكل من الأشكال.**

- إنه تحذير من المتصفح فقط
- لا يؤثر على الأداء بشكل ملحوظ
- لا يؤثر على وظائف التطبيق
- سيتم إصلاحه في تحديثات المكتبات المستقبلية

## 🔧 لماذا لا يمكن قمعه؟

هذا التحذير يأتي من الـ **browser engine** نفسه على مستوى منخفض جداً، قبل أن يتم تنفيذ أي JavaScript. لذلك لا يمكن قمعه من JavaScript.

## 📚 المراجع

- [W3C UI Events Specification](https://w3c.github.io/uievents/#legacy-event-types)
- [MDN: MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)

## 🎯 الحل المستقبلي

سيتم إصلاح هذا التحذير عندما تقوم المكتبات (PrimeNG, CoreUI) بتحديث كودها لاستخدام `MutationObserver` بدلاً من DOM Mutation Events.

---

**ملاحظة**: تمت محاولة قمع هذا التحذير في `src/main.ts` و `src/index.html`، لكنه قد يظهر أحياناً لأنه يأتي من الـ browser engine نفسه.

