// src/i18n/translations/email.ts
// Email-specific translation keys for en-US and es-ES.

import type { Translations } from '../types';

export const EMAIL_TRANSLATIONS: Translations = {
  'en-US': {
    // Welcome
    'email.welcome.subject': 'Welcome to Good Neighbor!',
    'email.welcome.greeting': 'Hi {{name}}, welcome to the community!',
    'email.welcome.body': 'We are thrilled to have you join Good Neighbor. Get started by creating your profile.',
    'email.welcome.cta': 'Complete Your Profile',
    'email.welcome.footer': 'Thanks for joining us!',

    // Verification
    'email.verification.subject': 'Verify your email address',
    'email.verification.greeting': 'Hi {{name}},',
    'email.verification.body': 'Please verify your email address by clicking the link below.',
    'email.verification.cta': 'Verify Email',
    'email.verification.expiry': 'This link expires in {{hours}} hours.',
    'email.verification.ignore': 'If you did not create an account, you can ignore this email.',

    // Password Reset
    'email.password_reset.subject': 'Reset your password',
    'email.password_reset.greeting': 'Hi {{name}},',
    'email.password_reset.body': 'We received a request to reset your password. Click the link below to create a new password.',
    'email.password_reset.cta': 'Reset Password',
    'email.password_reset.expiry': 'This link expires in {{hours}} hours.',
    'email.password_reset.ignore': 'If you did not request a password reset, you can ignore this email.',

    // Notifications
    'email.notification.new_comment': '{{author}} commented on your post "{{title}}"',
    'email.notification.new_reply': '{{author}} replied to your comment',
    'email.notification.new_follower': '{{follower}} started following you',
    'email.notification.new_like': '{{user}} liked your post "{{title}}"',
    'email.notification.new_mention': '{{user}} mentioned you in a post',
    'email.notification.feed_submission': 'New submission to "{{feedName}}" by {{author}}',
    'email.notification.submission_approved': 'Your submission to "{{feedName}}" was approved',
    'email.notification.submission_rejected': 'Your submission to "{{feedName}}" was rejected',
    'email.notification.feed_invite': 'You have been invited to moderate "{{feedName}}"',

    // Digest
    'email.digest.subject': 'Your Good Neighbor weekly digest',
    'email.digest.greeting': 'Hi {{name}}, here is what happened this week:',
    'email.digest.new_posts': '{{count}} new posts in your feeds',
    'email.digest.new_followers': '{{count}} new followers',
    'email.digest.new_comments': '{{count}} new comments on your posts',
    'email.digest.trending': 'Trending in your neighborhood',
    'email.digest.cta': 'View All Activity',

    // Common email elements
    'email.common.unsubscribe': 'Unsubscribe from these emails',
    'email.common.preferences': 'Manage notification preferences',
    'email.common.support': 'Need help? Contact us at {{email}}',
    'email.common.footer_text': 'You are receiving this because you have an account with Good Neighbor.',
    'email.common.view_online': 'View this email online',
    'email.common.from_name': 'Good Neighbor',
    'email.common.reply_notice': 'Please do not reply to this email directly.',

    // Account
    'email.account.deactivated.subject': 'Your account has been deactivated',
    'email.account.deactivated.body': 'Your Good Neighbor account has been deactivated. Contact support if this was a mistake.',
    'email.account.reactivated.subject': 'Your account has been reactivated',
    'email.account.reactivated.body': 'Your Good Neighbor account is active again. Welcome back!',
    'email.account.security_alert.subject': 'Security alert for your account',
    'email.account.security_alert.body': 'We noticed unusual activity on your account from {{location}}.',

    // Moderation
    'email.moderation.content_removed.subject': 'Content removed from Good Neighbor',
    'email.moderation.content_removed.body': 'Your post "{{title}}" was removed for violating community guidelines.',
    'email.moderation.warning.subject': 'Community guidelines warning',
    'email.moderation.warning.body': 'This is a reminder to follow our community guidelines.',
  },

  'es-ES': {
    // Welcome
    'email.welcome.subject': '¡Bienvenido a Good Neighbor!',
    'email.welcome.greeting': '¡Hola {{name}}, bienvenido a la comunidad!',
    'email.welcome.body': 'Estamos encantados de que te unas a Good Neighbor. Comienza creando tu perfil.',
    'email.welcome.cta': 'Completa tu perfil',
    'email.welcome.footer': '¡Gracias por unirte!',

    // Verification
    'email.verification.subject': 'Verifica tu dirección de correo electrónico',
    'email.verification.greeting': 'Hola {{name}},',
    'email.verification.body': 'Por favor verifica tu dirección de correo electrónico haciendo clic en el enlace a continuación.',
    'email.verification.cta': 'Verificar correo',
    'email.verification.expiry': 'Este enlace expira en {{hours}} horas.',
    'email.verification.ignore': 'Si no creaste una cuenta, puedes ignorar este correo.',

    // Password Reset
    'email.password_reset.subject': 'Restablece tu contraseña',
    'email.password_reset.greeting': 'Hola {{name}},',
    'email.password_reset.body': 'Recibimos una solicitud para restablecer tu contraseña. Haz clic en el enlace a continuación para crear una nueva contraseña.',
    'email.password_reset.cta': 'Restablecer contraseña',
    'email.password_reset.expiry': 'Este enlace expira en {{hours}} horas.',
    'email.password_reset.ignore': 'Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo.',

    // Notifications
    'email.notification.new_comment': '{{author}} comentó en tu publicación "{{title}}"',
    'email.notification.new_reply': '{{author}} respondió a tu comentario',
    'email.notification.new_follower': '{{follower}} comenzó a seguirte',
    'email.notification.new_like': '{{user}} le dio me gusta a tu publicación "{{title}}"',
    'email.notification.new_mention': '{{user}} te mencionó en una publicación',
    'email.notification.feed_submission': 'Nueva publicación en "{{feedName}}" por {{author}}',
    'email.notification.submission_approved': 'Tu publicación en "{{feedName}}" fue aprobada',
    'email.notification.submission_rejected': 'Tu publicación en "{{feedName}}" fue rechazada',
    'email.notification.feed_invite': 'Has sido invitado a moderar "{{feedName}}"',

    // Digest
    'email.digest.subject': 'Tu resumen semanal de Good Neighbor',
    'email.digest.greeting': 'Hola {{name}}, esto es lo que pasó esta semana:',
    'email.digest.new_posts': '{{count}} nuevas publicaciones en tus feeds',
    'email.digest.new_followers': '{{count}} nuevos seguidores',
    'email.digest.new_comments': '{{count}} nuevos comentarios en tus publicaciones',
    'email.digest.trending': 'Tendencias en tu vecindario',
    'email.digest.cta': 'Ver toda la actividad',

    // Common email elements
    'email.common.unsubscribe': 'Cancelar suscripción a estos correos',
    'email.common.preferences': 'Gestionar preferencias de notificación',
    'email.common.support': '¿Necesitas ayuda? Contáctanos en {{email}}',
    'email.common.footer_text': 'Recibes este correo porque tienes una cuenta en Good Neighbor.',
    'email.common.view_online': 'Ver este correo en línea',
    'email.common.from_name': 'Good Neighbor',
    'email.common.reply_notice': 'Por favor no respondas directamente a este correo.',

    // Account
    'email.account.deactivated.subject': 'Tu cuenta ha sido desactivada',
    'email.account.deactivated.body': 'Tu cuenta de Good Neighbor ha sido desactivada. Contacta soporte si fue un error.',
    'email.account.reactivated.subject': 'Tu cuenta ha sido reactivada',
    'email.account.reactivated.body': 'Tu cuenta de Good Neighbor está activa de nuevo. ¡Bienvenido de vuelta!',
    'email.account.security_alert.subject': 'Alerta de seguridad para tu cuenta',
    'email.account.security_alert.body': 'Detectamos actividad inusual en tu cuenta desde {{location}}.',

    // Moderation
    'email.moderation.content_removed.subject': 'Contenido eliminado de Good Neighbor',
    'email.moderation.content_removed.body': 'Tu publicación "{{title}}" fue eliminada por violar las normas de la comunidad.',
    'email.moderation.warning.subject': 'Advertencia sobre normas de la comunidad',
    'email.moderation.warning.body': 'Este es un recordatorio para seguir nuestras normas de la comunidad.',
  },
};
