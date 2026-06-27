import nodemailer from "nodemailer"
import {WELCOME_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE} from "@/lib/nodemailer/templates";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
})

export const sendWelcomeEmail = async ({email, name, intro}: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace('{{name}}', name)
        .replace('{{intro}}', intro);

    const mailOptions = {
        from: `"Signalist" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject: 'Welcome to Signalist - your stock market toolkit is ready!',
        text: 'Thanks for joining',
        html: htmlTemplate
    }

    await transporter.sendMail(mailOptions)
}

export const sendNewsSummaryEmail = async ({email, content, date}: {email: string, content: string, date: string}) => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{newsContent}}', content)
        .replace('{{date}}', date);

    const mailOptions = {
        from: `"Signalist" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject: `Market News Summary - ${date}`,
        text: 'Your daily market news summary is here.',
        html: htmlTemplate
    }

    await transporter.sendMail(mailOptions)
}