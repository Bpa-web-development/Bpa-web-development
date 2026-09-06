async function loadSubscriptionPlans() {
    try {
        const response = await fetch("/data/SubscriptionPlanData.json");

        console.log(response)
        if (!response.ok) {
            throw new Error("Could not load SubscriptionPlanData.json");
        }

        SubscriptionPlanData = await response.json();

    } 
    catch (error) {
        console.error("Subscription Plan Data error:", error);
    }
    buildSubscriptionPlans(SubscriptionPlanData);
}

function buildSubscriptionPlans(data) {
    console.log(data)
    const container = document.getElementById("SubscriptionCardContainer");
    container.innerHTML = data.map(plan => `
        <div class="SubscriptionCard">
            <h2>${plan.name}</h2>
            <p>Price: ${plan.price}</p>
            <p>${plan.description}</p>
            <ul>
                ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}


loadSubscriptionPlans();