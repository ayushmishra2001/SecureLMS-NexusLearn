import {
    trigger, state, style, animate, transition,
    query, stagger, keyframes, group
} from '@angular/animations';

export const fadeSlideIn = trigger('fadeSlideIn', [
    transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('380ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])
]);

export const fadeIn = trigger('fadeIn', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('280ms ease', style({ opacity: 1 }))
    ])
]);

export const listStagger = trigger('listStagger', [
    transition('* => *', [
        query(':enter', [
            style({ opacity: 0, transform: 'translateX(-12px)' }),
            stagger(40, [
                animate('280ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateX(0)' }))
            ])
        ], { optional: true })
    ])
]);

export const cardPop = trigger('cardPop', [
    transition(':enter', [
        style({ opacity: 0, transform: 'scale(.94) translateY(10px)' }),
        animate('320ms cubic-bezier(.34,1.4,.64,1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
    ])
]);

export const modalAnim = trigger('modalAnim', [
    transition(':enter', [
        style({ opacity: 0, transform: 'scale(.92) translateY(16px)' }),
        animate('260ms cubic-bezier(.34,1.2,.64,1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
    ]),
    transition(':leave', [
        animate('180ms ease', style({ opacity: 0, transform: 'scale(.96) translateY(8px)' }))
    ])
]);

export const overlayAnim = trigger('overlayAnim', [
    transition(':enter', [style({ opacity: 0 }), animate('220ms ease', style({ opacity: 1 }))]),
    transition(':leave', [animate('180ms ease', style({ opacity: 0 }))])
]);

export const slideInRight = trigger('slideInRight', [
    transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(.4,0,.2,1)', style({ transform: 'translateX(0)' }))
    ]),
    transition(':leave', [
        animate('250ms ease', style({ transform: 'translateX(100%)' }))
    ])
]);

export const toastAnim = trigger('toastAnim', [
    transition(':enter', [
        style({ opacity: 0, transform: 'translateX(60px) scale(.9)' }),
        animate('280ms cubic-bezier(.34,1.2,.64,1)', style({ opacity: 1, transform: 'translateX(0) scale(1)' }))
    ]),
    transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateX(60px) scale(.9)' }))
    ])
]);

export const sectionAnim = trigger('sectionAnim', [
    transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])
]);