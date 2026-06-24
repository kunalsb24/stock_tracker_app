'use server';

import {auth} from "@/lib/better-auth/auth";
import {inngest} from "@/lib/inngest/client";
import {headers} from "next/headers";

export const signUpWithEmail = async ({email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry}: SignUpFormData) => {
    try {
        // Call better-auth: handles user creation, password hashing, and session creation in mongodb
        const response = await auth.api.signUpEmail({
            body: {email, password, name: fullName}
        })

        // if user creation is successful, trigger the inngest background processing
        if (response){
            await inngest.send({
                name: 'app/user.created',
                data: {email, name:fullName, country, investmentGoals, riskTolerance, preferredIndustry}
            })
        }

        return {success: true, data: response}

    } catch (e){
        console.log('Sign up failed', e)
        return {success: false, message: 'Sign up failed'}
    }
};

export const signOut = async () => {
    try{
        await auth.api.signOut({headers: await headers()})
    } catch (e){
        console.log('Sign out failed', e)
        return {success: false, message: 'Sign out failed'}
    }
}

export const signInWithEmail = async ({email, password }: SignInFormData) => {
    try {
        // Call better-auth: handles user creation, password hashing, and session creation in mongodb
        const response = await auth.api.signInEmail({
            body: {email, password}
        })


        return {success: true, data: response}

    } catch (e){
        console.log('Sign In failed', e)
        return {success: false, message: 'Sign In failed'}
    }
};