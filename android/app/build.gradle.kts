import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "fr.superbebe.widget"
    compileSdk = 36

    defaultConfig {
        applicationId = "fr.superbebe.widget"
        minSdk = 26
        targetSdk = 36
        versionCode = 24
        versionName = "0.20.0"
    }

    buildFeatures {
        compose = true
    }

    // Tests des widgets sur l'ordinateur (Robolectric) : rendu Glance réel, avec les ressources de l'app.
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.glance:glance-appwidget:1.1.1")
    implementation("androidx.work:work-runtime-ktx:2.10.5")
    implementation("androidx.javascriptengine:javascriptengine:1.0.0")
    implementation("androidx.concurrent:concurrent-futures-ktx:1.2.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
    testImplementation("androidx.test:core:1.6.1")
}
