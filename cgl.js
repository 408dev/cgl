/* Convay Game of Life */
class CGL
{
	// initializing state
	constructor()
	{
		this.width = 0;
		this.height = 0;
		this.data = [];
		this.tick = 0;
	}

	// resizing field to a new width, height (shrink or increase). In case of shrinking we lose data
	resize(nw, nh)
	{
		if (isNaN(parseInt(nw)) || !isFinite(nw) || isNaN(parseInt(nh)) || !isFinite(nh))
			return false;
		nw = parseInt(nw);
		nh = parseInt(nh);

		if (nw == this.width && nh == this.height)
			return false;

		// New data array with new dimentions
		let narr = Array.from({length: nw*nh}, x => 0);

		// Filling new array with old values
		this.data.forEach( (v, i) => 
		{
			// calculate x,y coordinates from index (0,0 - top left point)
			let x = i%this.width;
			let y = Math.floor(i/this.width);

			// Minimum values of new width and height to insure we are leving this item of array
			let ch_y = 0;
			let ch_x = 0;

			if (this.height % 2)
				ch_y = (y <= Math.floor(this.height/2)) ? (this.height - 2*y) : (2*y - this.height + 1);
			else
				ch_y = (y < this.height/2) ? (this.height - 2*y) : (2*y - this.height + 1);

			if (this.width % 2)
				ch_x = (x <= Math.floor(this.width/2)) ? (this.width - 2*x) : (2*x - this.width + 1);
			else
				ch_x = (x < this.width/2) ? (this.width - 2*x) : (2*x - this.width + 1);

			// If we shrink data that big - throw away this item
			if (ch_x > nw || ch_y > nh)
				return;

			// Otherway - calculating new coordinates for this item in new array
			let nx = x + ( (nw >= this.width)?1:-1 )*Math.ceil( Math.abs(nw - this.width)/2 );
			let ny = y + ( (nh >= this.height)?1:-1 )*Math.ceil( Math.abs(nh - this.height)/2 );

			narr[ ny * nw + nx ] = v;
		});

		this.data = narr;
		this.width = nw;
		this.height = nh;

		return true;
	}

	// Set the point in a field to value f (0-1)
	setData(x, y, f)
	{
		if (x >= 0 && x < this.width)
			if (y >= 0 && y < this.height)
				this.data[ y * this.width + x ] = f?1:0;
	}

	// Gets the data from the point (0 - for the out-of-boundaries)
	getData(x, y)
	{
		if (x >= 0 && x < this.width)
			if (y >= 0 && y < this.height)
				return this.data[ y * this.width + x ];
		return 0;
	}

	// Gets the snapshot of all data - to visualize
	getCurrentData()
	{
		return {w: this.width, h: this.height, d: this.data, t: this.tick};
	} 

	// Do we need to resize our field (because we have data on the edges - and it may need more rows/columns to fill in)
	//		Return only boolen flag, caller is responsible to call cgl.resize with needed increasing (or ignore it)
	//		In case of ignoring - everything out of boundaries remains dead
	needsResize()
	{
		let resize = false;
		for (let j = 0; j < this.width; j++)
			if (this.getData(j, 0) || this.getData(j, this.height - 1))
			{
				resize = true;
				break;
			}

		if (!resize)
			for (let j = 0; j < this.height; j++)
				if (this.getData(0, j) || this.getData(this.width - 1, j))
				{
					resize = true;
					break;
				}	

		return resize;
	}

	// Next tick of the life. Recalculate data. Mind the needResize functions that 
	//	should be called before the tick to insure there is enough place for data or limit the internal state otherwise
	nextTick()
	{
		let nd = [];
		for (let i = 0; i < this.data.length; i++)
		{
			let x = i%this.width;
			let y = Math.floor(i/this.width);

			let sum = 0;
			for (let k = -1; k <= 1; k++)
				for (let l = -1; l <= 1; l++)
					if (k != 0 || l != 0)
						sum += this.getData(x + k, y + l);

			if (this.data[i])
				nd.push((sum > 3 || sum < 2)?0:1);
			else
				nd.push((sum == 3)?1:0);
		}
		this.data = nd;
		this.tick++;
	}
}