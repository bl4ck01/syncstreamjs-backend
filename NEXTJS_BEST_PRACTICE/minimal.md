# React & Next.js in 2025 - Modern Best Practices

*Last updated: June 12, 2025 (Strapi 5 era)*

## Introduction to Modern Web Best Practices

If you have ever used React or Next.js or any frontend framework, chances are that you have worked with some of the following concepts:

- State Management
- Data Fetching
- Performance Optimization
- Code Maintainability
- Accessibility

In this tutorial, we will break down the state of modern frontend development with React and Next.js.

Let's explore the practical best practices for building fast, maintainable, accessible web apps in 2025. From state management to hybrid rendering, code splitting, caching, server actions, and accessibility.

## State Management in React and Why You May Not Need a Library

When you think of State Management, a familiar question comes up, "What kind of State Management library do we need?". This follows with answers such as Redux, Zustand, etc.

However, you may not need a State Management library for your project!

### Reasons Why You May Not Need a State Management Library

Shruti Kapoor, a former Frontend Engineer at Slack who was building a web app for Paypal at the time used Redux for caching user forms.

Later on, they added GraphQL because they were sending a huge amount of data to users. However, because GraphQL needed Apollo client which also came with Apollo cache, they got caching for free!

What ended up happening is that Redux became useless as such ended up with a small bundle and not having to show Redux to the client.

It is important to think about the kind of data are you sending over to the client.

Libraries for state management also get bundled and sent to the client which they don't need. In other words, "Don't give me your garbage".

We also don't want users to wait, so we want to be able to send small bundles to the client and not excessive data.

### State Management in React

Say you don't want to use a state management library, how do you implement state management in React?

For most Single Page Applications (SPA), the 3 following React state management hooks are enough:

- **useState**: A React Hook that lets you add a state variable to your component.
- **useContext**: A React state management Hook that lets you read and subscribe to context from your component.
- **useReducer**: Similar to useState, but it lets you move the state update logic from event handlers into a single function outside of your component.

If you have to share data between components, you can then add external libraries that are lighter in weight than Redux. They include:

- Jotai
- Zustand
- TanStack Query

### How to Determine Which State Management Library To Use

Here is a decision matrix to show which state management library to use when working on a project or application:

| Scenario | Recommended Solution |
|----------|---------------------|
| Small application | useState or useReducer |
| Complex state sharing between components | Jotai |
| No server integration or need to fetch lots of data | Zustand or Redux |
| Limit client data and enable auto-caching | TanStack Query |

If you have a small application, you can use useState or useReducer.

If you have a lot of complexities and need to share data between components, that is when you need external state libraries such as Jotai.

If you don't have server integration or you have to fetch a lot of data, Zustand and Redux are great options.

If you want to limit the data that comes to the client but want to perform auto-caching, TanStack is a great option.

### Best Practices for State Management in React

Here are some of the best practices for state management in a React application.

#### 1. Keep States Close to Components

In React applications, you need to make sure you keep states as close to the component that uses the states at all times.

Take a look at the code below:

```javascript
// BAD EXAMPLE: State too high in the component tree
function App() {
 // state lives too high in the component tree
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedItem, setSelectedItem] = useState(null);

 return (
   <div className="app">
     <Header /> // re-renders when state changes
     <Sidebar /> // re-renders when state changes
     <MainContent
       searchTerm={searchTerm}
       setSearchTerm={setSearchTerm}
     />
   </div>
 );
}
```

The code above is a search model with a header, sidebar, and main content. The main content needs to know the search term and the searched data.

The problem with the code above is that anytime searchTerm changes, the whole component re-renders.

Also, Header and Sidebar do not need the searchTerm state. So we are re-rendering components based on data they don't even need.

The best practice would be to move the states to only the component that needs it, in this case, the MainContent as shown in the code below.

```javascript
// GOOD EXAMPLE: State colocated with the component that uses it

// Main Component
function MainComponent() {
 // Search State is now moved to the Components that Need it
 const [searchTerm, setSearchTerm] = useState("");
 const [isSearchFocused, setIsSearchFocused] = useState(null);

 return (
   <div className="main-content">
     <SearchBar
       searchTerm={searchTerm}
       setSearchTerm={setSearchTerm}
       isSearchFocused={isSearchFocused}
       setIsSearchFocused={setIsSearchFocused}
     />
     <SearchResults searchTerm={searchTerm} />
   </div>
 );
}

// App component
function App() {
 return (
   <div className="app">
     <Header />
     <Sidebar />
     <MainContent />
     <Footer />
   </div>
 );
}
```

In the code above, we have now moved the states to the MainComponent component that only uses it. Now, the App component is cleaner. When search state updates, Header and Sidebar components are not re-rendered.

Although, this goes against the philosophy of "Lift State Up", you want to lift the state up, but only as close to the component as possible.

#### 2. Manage Dependencies or States Granularly

Imagine you have a User component that fetches user data by using the user ID as shown below:

```javascript
function UserProfileBad({ userId }) {
 // Bad: dependency on the entire user object

 const [user, setUser] = useState(null);

 useEffect(() => {
   // fetch the entire user object
   fetchUserData(userId).then((userData) => {
     setUser(userData);
   });
 }, [userId]);
}
```

In the code above, we are managing the entire userData object. This means that whenever userData state changes, all components will re-render. This is a wrong approach.

We only want to extract items or data that we need which are userName, userStats, activities, and friends. So we have to create states for each of these data.

This way, our app doesn't need to depend on the entire userData object which is a lot of state to watch for and that causes re-render.

Here is a good way to manage states granularly:

```javascript
// GOOD PRACTICE: Granular state and selectors
function UserProfileGood({ userId }) {
 // Split state into meaningful pieces
 const [userName, setUserName] = useState("");
 const [userStats, setUserStats] = useState(null);
 const [activities, setActivities] = useState([]);
 const [friends, setFriends] = useState([]);

 useEffect(() => {
   // Fetch only what's needed or extract specific pieces from resp
   fetchUserData(userId).then((userData) => {
     setUserName(userData.name);
     setUserStats(userData.stats);
     setActivities(userData.recentActivities);
     setFriends(userData.friends);
   });
 }, [userId]);
}
```

#### 3. One Source of Truth

When we add multiple libraries and states using Redux, Jotai, etc. we shouldn't have the same data present in more than one place.

For example, the same data should not be present in both the Context API and the Redux store.

## Data Fetching in React

The whole approach to data fetching is "Don't make me wait". If you are loading any component data, ensure it loads as fast as possible.

Ensure that users get the next interaction as fast as they can because this determines how fast or slow they perceive your app.

### Next.js Data Fetching Techniques

These are some techniques to keep in mind when fetching Data:

- Next.js Rendering Strategies
- Next.js Caching
- Next.js Routing
- Using the Server
- Lazy Loading Images

### Next.js Rendering Strategies

There are 4 different rendering strategies:

- **Client-side Rendering (CSR)**
- **Static Site Generation (SSG)**
- **Incremental Static Regeneration (ISR)**
- **Server-side Rendering (SSR)**

The Next.js rendering strategies above can be confusing. Here is an illustration to better understand them:

**Rendering is how you put food on the table:**

- **SSR** is when you don't have to do any work because the server gives you all the food for free.
- **CSR** is when you have to go to the grocery store, buy all ingredients, go home, figure out how to cook, etc.
- **SSG** is like going to a buffet and food is always there. The server comes and tops up the food when the food runs out.
- **ISR** means that food is always in the buffet, but at a particular interval of time, the server is going to make sure the food is hot and fresh. This means that content is regenerated or re-updated.

### Hybrid Rendering in React

The recommended and best practice for rendering is known as **Hybrid rendering**.

Hybrid rendering is when you combine different rendering strategies for different purposes.

Examine the code below:

```javascript
return (
 <>
   {/* Server Component with product details (SSR) */}
   <ProductDetails product={product} />

   {/* Static part pre-rendered (SSG) */}
   <SimilarProducts products={similarProducts} />

   {/* Client Component with dynamic content (CSR) */}
   <Reviews reviews={reviews} />
 </>
);
```

Let's explain the code above based on the rendering strategies we mentioned:

#### SSR Example
**ProductDetails component** will require that you talk to the server for product details information. You may also need to do some database interactions and API calls. That is a good place to do SSR. You can use the `getServerSideProps` in Next.js to achieve this.

#### SSG Example
**SimilarProducts** is a component that contains static contents. Similar products are not likely to change. SSG is the best option here. For this, you will use the `getStaticProps` in Next.js to achieve this.

#### CSR Example
**Reviews component** will require that you need to see the latest reviews of products. This could be real-time reviews and a number of stars. For this, you need CSR. Here is where the popular `useEffect` hook comes in.

#### CSR + useSWR
To take a step further, we could add `useSWR` to the `useEffect` hook. This is where the server comes in to make sure the reviews are up-to-date. This means "stale-while-revalidate", a strategy to first return the data from cache (stale), then send the fetch request (revalidate), and finally come with the up-to-date data.

#### ISR Example
We could implement ISR on the SimilarProducts component by revalidating its content after 60 seconds with the following code. This way, our food is always hot and fresh, based on the food analogy we explained above.

```javascript
{/* Static part pre-rendered (SSG) */}
<SimilarProducts products={similarProducts} />

getStaticProps() {
 return {
   props: {},
   revalidate: 60
 }
}
```

### Other Next.js Rendering Strategies

There are other strategies you can use to render content. They include:

- **Server Actions**: You add a function known as action on the server itself. For example, a function calls the database on the server itself. This can be done using Next.js and TanStack Query. This will prevent excessive work on the client.

- **Server Components**: You can render components on the Server using Server Components and then send the component downstream so the client doesn't need to do any work but to render the data or component that comes from the server.

- **Streaming with Suspense**: You can stream data with Suspense. For example, in an app like a video player where data comes in, you can show a fallback loader component with Suspense instead of making the client wait for the data. And when the data is ready, you can then stream the data to the user.

## Performance Optimization in Next.js

Let's learn how to optimize a Next.js application. Here are some tips on how to optimize your application.

### Avoid Premature Optimization - "Monitor first, Optimize Later"

In some cases, when you start building out an application without measuring performance, you will want to start using some hooks like `useMemo` and `useCallback` simply because you think a component is slow.

However, how do you know you have improved performance when you haven't monitored the current performance? Or, how then do we monitor the performance of an app?

We can use Core Web Vitals. Let's see what they are.

### Core Web Vitals

Core Web Vitals are three metrics (LCP, INP, and CLS) that measure the performance of a web application.

- **Largest Contentful Paint (LCP)**: LCP is what time or how long it takes the largest or biggest content on a page to load or render. For example, a YouTube app. If you are on the video player, the LCP will be the video player itself.

- **Interaction to Next Paint (INP)**: INP is how long it takes for an interaction on your app to be executed. For example, using the YouTube video player, when you click the play button, how long will it take for the video to start playing? This is the time it takes from an interaction, which is clicking the button, to painting the page, which is the video to start loading and playing.

- **Cumulative Layout Shift (CLS)**: CLS is how much a web page's content shifts while it is loading. For example, when you click on a user profile on the YouTube home page. As the video loads, the images begin to shift. You want to make sure you minimize CLS in order to improve performance.

### How to Access Core Web Vitals

Core web vitals can be accessed through the following:

- **Browser Console**: Open up the browser console, and in the Performance tab you will find the Core Web vitals.

- **React Profiler**: Allows you to measure the rendering performance of a React tree programmatically. You can import it as the `<Profiler>` component. Also, this helps you to know where the bottlenecks are and where to use some React hooks like the `useMemo` and `useCallback`.

- **React Scan**: Helpful in understanding which components are slow.

- **Next.js Analytics**: Useful for reporting web vitals. This is a Next.js built-in support feature.

After understanding which components are slow in your app, you can go ahead to use `useCallback` and `useMemo` to memoize your components. And if you are using React 19, you can use React Compiler which has a plugin and does auto memoization.

### Next.js Performance Optimization Demo - A YouTube Clone

Here are the optimization steps for improving a YouTube clone application:

#### Step 1: Starting Point and Unoptimized Mess

Let's start with the first visible issues:

- Client-side rendering is everywhere
- No pagination or infinite scroll
- Poor image handling
- Memoization or caching is missing for components
- There is no lazy loading

**Solutions:**

1. Use Next.js `<Image/>` component with `loading='lazy'`.
2. Use Dynamic imports.
3. Use responsive image sizes.
4. Use CDN for asset delivery.
5. Implement infinite scrolling.
6. Load videos in chunks.

#### Step 2: Static Site Generation (SSG)

Some of the content in the YouTube clone can be generated as static content and delivered through a CDN.

- Use `getStaticProps`.
- Preload popular videos with `generateStaticParams`.
- Deliver assets from a CDN.
- If there are a lot of data, you can use `generateMetaData` to generate content from out of the server for SEO.

#### Step 3: Server-Side Rendering

We can server-render some data and more:

- Render components using the server since all videos look the same except for the titles and video source.
- Use Suspense boundary with skeleton loader for the images and stream the data when they are ready using Suspense.
- Fetch data on the server for the initial load.

#### Step 4: Stale-While-Revalidate (SWR)

- Use SWR for user comments. This will cache comments for some time and re-update after some time too.
- Use `useSWRInfinite` or TanStack query for infinite Scrolling.

#### Step 5: Additional Optimizations

- Memoize components.
- Perform code splitting.
- Implement progressive enhancement. For example, show a poor-quality thumbnail and as the image starts loading, you progressively improve the image. The same goes for videos.
- Reduce app bundle size, which is the amount of libraries sent to the client.

## Code Maintainability in Next.js and React

Here are some best practices for Code Maintainability:

- **Document as you go**: With AI, you can get the documentation built without spending time writing the documentation. If you forget to document, you may have poor documentation in the future.

- **Component Structure**: Think about the component structure and follow through with the structure. Some companies create folders for every component and everything that goes with them, such as text and types, in the same component folder.

- **Test More than just Unit Tests**: In addition to unit tests, perform user tests. This is to ensure your app works as it should from the start of use to the end. Write automated End-to-End (E2E) tests as well to make sure you can test for new features. Accessibility tests are also great to carry out for people using assistive technologies. Test coverage is recommended to be 80% or higher.

## Accessibility in React and Next.js

If you are building an app for the web without thinking about everyone, you are unconsciously excluding people from the web.

Here are some best practices for web accessibility in React and Next.js:

- **Use Semantic HTML**: Use semantic names for elements.

- **Use Accessible Rich Internet Applications (ARIA) attributes carefully**: For example, some ARIA attributes are already within them, so you don't need to redo them. An example is the `<button>` element.

- **Strive for AA accessibility**: Meet WCAG AA compliance standards.

- **Use linters for accessibility**: With linters, you won't be able to miss out on ARIA attributes during development.

- **Test keyboard and screen readers**: This will be helpful for users who depend on assistive technologies.

- **Perform user testing**: Ensure that real users test the app even those that use assistive technologies.

## Conclusion

In this tutorial, we have broken down the state of modern frontend development with React and Next.js.

We explored practical best practices for building fast, maintainable, accessible web apps in 2025. From React state management hooks and why you may not need state management libraries to hybrid rendering (SSG, SSR, CSR, and ISR), code splitting, caching, server actions, and accessibility.

The theme of this tutorial is **"Don't make me wait"**. Don't make users wait for data to come in, a page to render, or layouts to shift. And don't give users of your app garbage.

---

*Article by Theodore Kelechukwu Onyejiaku - Technical Writer and full-stack software developer who loves writing technical articles, building solutions, and sharing expertise.*