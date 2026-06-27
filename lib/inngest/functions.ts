import {inngest} from "@/lib/inngest/client";
import {PERSONALIZED_WELCOME_EMAIL_PROMPT, NEWS_SUMMARY_EMAIL_PROMPT} from "@/lib/inngest/prompts";
import {sendWelcomeEmail, sendNewsSummaryEmail} from "@/lib/nodemailer";
import {getAllUsersForNewsEmail} from "@/lib/actions/user.actions";
import {getWatchlistSymbolsByEmail} from "@/lib/actions/watchlist.actions";
import {getNews} from "@/lib/actions/finnhub.actions";
import {getFormattedTodayDate} from "@/lib/utils";

interface UserForNewsEmail {
    id: string;
    email: string;
    name: string;
}

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email', triggers: [{ event: 'app/user.created' }] },
    async ({ event, step }: { event: any, step: any }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({ model: 'gemini-1.5-flash' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }]
            }
        })

        await step.run('send-welcome-email', async () => {
            const candidates = response.candidates || [];
            const parts = candidates[0]?.content?.parts || [];
            const textPart = parts.find(p => 'text' in p && !('thought' in p && p.thought));
            const introText = (textPart && 'text' in textPart ? textPart.text : null) || 'Thanks for joining Signalist. You now have the tools to track markets and make smarter moves.'

            const { data: { email, name } } = event;

            return await sendWelcomeEmail({ email, name, intro: introText });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    {
        id: 'daily-news-summary',
        triggers: [{ event: 'app/send.daily.news' }, { cron: '* * * * *' }]
    },
    async ({ step }) => {
        const users = await step.run('get-all-users', async () => {
            return await getAllUsersForNewsEmail();
        });

        if (!users || users.length === 0) {
            return { success: true, message: 'No users found for news email' };
        }

        const results = [];

        for (const user of users) {
            try {
                const news = await step.run(`fetch-news-${user.id}`, async () => {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    return await getNews(symbols);
                });

                if (!news || news.length === 0) {
                    results.push({ user: user.email, status: 'skipped', reason: 'no news' });
                    continue;
                }

                const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(news));

                const response = await step.ai.infer(`summarize-news-${user.id}`, {
                    model: step.ai.models.gemini({ model: 'gemini-1.5-flash' }),
                    body: {
                        contents: [
                            {
                                role: 'user',
                                parts: [{ text: prompt }]
                            }]
                    }
                });

                // Improved response parsing for Gemini
                const candidates = response.candidates || [];
                const parts = candidates[0]?.content?.parts || [];
                // Find the first text part that is not a thought
                const textPart = parts.find(p => 'text' in p && !('thought' in p && p.thought));
                const newsContent = textPart && 'text' in textPart ? textPart.text : '';

                if (!newsContent) {
                    results.push({ user: user.email, status: 'skipped', reason: 'AI summary empty' });
                    continue;
                }

                await step.run(`send-email-${user.id}`, async () => {
                    const date = getFormattedTodayDate();
                    return await sendNewsSummaryEmail({
                        email: user.email,
                        content: newsContent,
                        date
                    });
                });

                results.push({ user: user.email, status: 'sent' });
            } catch (error: any) {
                console.error(`Error processing news for user ${user.email}:`, error);
                results.push({ user: user.email, status: 'failed', error: error.message });
            }
        }

        return {
            success: true,
            message: 'News summary process completed',
            results
        };
    }
)