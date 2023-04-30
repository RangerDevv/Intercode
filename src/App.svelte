<script>
	let code = "";
	let key = "";
	let output = "";

	async function getSuggestion() {
	const response = await fetch('https://api.openai.com/v1/engines/text-davinci-003/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
      },
      body: JSON.stringify({
        prompt: 'detect common programming mistakes and provide suggestions for code optimization for the following code and fix any errors: ' + code + ' write it normally without any comments',
        max_tokens: 2000,
        temperature: 0.9,
        top_p: 1,
      })
    });
    const data = await response.json();
	output = data.choices[0].text;
	} 


</script>

<h1 style="text-align: center; color: white;">Debu<span style="color: lime;">gPT</span></h1>

<main style="display: flex; flex-direction: row; align-items: center; justify-content: center; row-gap: 2px;">
<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-right: 4px;">
<h1>Input</h1>
<!--  create a text area for the user to input their code -->
<textarea bind:value={code} placeholder="Enter your code here"></textarea>

<!--  create a button to submit the code -->
<button on:click={getSuggestion}>Submit</button>
</div>

<div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
<h1>AI Suggestions</h1>
<!--  create a text area to display the output -->
<textarea bind:value={output} placeholder="Output" style="width: 30rem; height: 60vh; background-color: rgb(31, 30, 30); color: white; outline-color: white; border: 0.5px solid white; padding: 10px; border-radius: 10px;"></textarea>
</div>

</main>

<input type="text" bind:value={key} placeholder="Enter your API key here" style="width: 30rem; height: 2rem; background-color: rgb(31, 30, 30); color: white; outline-color: white; border: 0.5px solid white; padding: 10px; border-radius: 10px; margin-left: 4px;">

<style>
	:root {
		/*  set the font size to 16px */
		font-size: 16px;
		background-color: rgb(50, 49, 49);
	}

	h1 {
		/*  set the font size to 1.5rem */
		font-size: 1.5rem;
		color: white;
	}

	/*  make the text area half the width of the screen */
	textarea {
		width: 30rem;
		height: 50vh;
		background-color: rgb(31, 30, 30);
		color: white;
		outline-color: white;
		border: 0.5px solid white;
		padding: 10px;
		border-radius: 10px;
	}

	/*  make the button the same width as the text area */
	button {
		width: 30rem;
		background-color: rgb(90, 28, 28);
		color: white;
		outline-color: white;
		border: 0.5px solid white;
		border-radius: 10px;
		padding: 10px;
	}

</style>